import asyncio
import logging
import time
from datetime import datetime
from typing import Optional

from services.config_service import get_config
from services.conversation_service import log_conversation, log_activity
from agent.instagram_agent import generate_greeting, generate_like_comment

logger = logging.getLogger(__name__)


class InstagramMonitor:
    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self.interval = 60
        self.last_poll: Optional[str] = None
        self.total_polls = 0
        self.new_followers_detected = 0
        self.new_likes_detected = 0
        self.errors = 0

    @property
    def is_running(self) -> bool:
        return self._running

    def get_status(self) -> dict:
        return {
            "running": self._running,
            "last_poll": self.last_poll,
            "total_polls": self.total_polls,
            "new_followers_detected": self.new_followers_detected,
            "new_likes_detected": self.new_likes_detected,
            "errors": self.errors,
        }

    async def start(self):
        if self._running:
            return {"status": "already_running"}

        config = get_config()
        self.interval = config.get("polling_interval_seconds", 60)

        # Validate config
        api_mode = config.get("api_mode", "instagrapi")
        if api_mode == "instagrapi":
            if not config.get("ig_username") or not config.get("ig_password"):
                return {"status": "error", "message": "Instagram username/password not configured"}
        else:
            if not config.get("access_token"):
                return {"status": "error", "message": "Instagram access token not configured"}

        if not config.get("llm_api_key"):
            return {"status": "error", "message": "LLM API key not configured"}

        self._running = True
        self._task = asyncio.create_task(self._poll_loop())
        log_activity("info", "Monitor started", f"Polling every {self.interval}s")
        return {"status": "started"}

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        log_activity("info", "Monitor stopped")
        return {"status": "stopped"}

    async def _poll_loop(self):
        """Main polling loop."""
        while self._running:
            try:
                self.last_poll = datetime.utcnow().isoformat()
                self.total_polls += 1

                # Alternate between checking followers and likes
                if self.total_polls % 2 == 1:
                    await self._check_new_followers()
                else:
                    await self._check_media_likes()

            except Exception as e:
                self.errors += 1
                logger.error(f"Monitor poll error: {e}")
                log_activity("error", f"Poll error: {str(e)}")

            await asyncio.sleep(self.interval)

    async def _check_new_followers(self):
        """Detect new followers and send greeting DMs."""
        config = get_config()
        if config.get("api_mode") != "instagrapi":
            log_activity("info", "Follower check skipped - Graph API doesn't support follower list")
            return

        try:
            from instagram.instagrapi_client import get_client, get_account_info, get_followers, send_dm
            from database import engine
            from sqlalchemy import text

            client = get_client(config["ig_username"], config["ig_password"])
            account_info = get_account_info(client)
            user_id = account_info["user_id"]

            # Get current followers (limited to avoid rate limits)
            current_followers = get_followers(client, user_id, amount=30)

            with engine.connect() as conn:
                # Get known followers
                result = conn.execute(text("SELECT instagram_user_id FROM known_followers"))
                known_ids = {row[0] for row in result.fetchall()}

                new_count = 0
                for follower in current_followers:
                    fid = follower["user_id"]
                    if fid not in known_ids:
                        # New follower detected!
                        username = follower.get("username", "")
                        new_count += 1
                        self.new_followers_detected += 1

                        # Insert into known followers
                        conn.execute(
                            text("INSERT INTO known_followers (instagram_user_id, instagram_username) VALUES (:uid, :uname) ON CONFLICT DO NOTHING"),
                            {"uid": fid, "uname": username},
                        )

                        # Generate and send greeting
                        greeting = generate_greeting(username)
                        dm_success = send_dm(client, [fid], greeting)

                        # Log the conversation
                        log_conversation(
                            instagram_user_id=fid,
                            instagram_username=username,
                            event_type="new_follower",
                            agent_action="sent_dm",
                            agent_message=greeting,
                        )

                        status = "sent" if dm_success else "failed"
                        log_activity("info", f"New follower @{username} - DM {status}", greeting)

                        # Small delay between DMs to avoid detection
                        await asyncio.sleep(3)

                conn.commit()

                if new_count > 0:
                    log_activity("info", f"Detected {new_count} new followers")
                else:
                    log_activity("info", "Follower check complete - no new followers")

        except Exception as e:
            self.errors += 1
            logger.error(f"Follower check error: {e}")
            log_activity("error", f"Follower check error: {str(e)}")

    async def _check_media_likes(self):
        """Detect new likes on posts and post contextual comments."""
        config = get_config()
        if config.get("api_mode") != "instagrapi":
            log_activity("info", "Like check skipped - Graph API doesn't support liker list")
            return

        try:
            from instagram.instagrapi_client import (
                get_client, get_account_info, get_user_medias,
                get_media_likers, post_comment,
            )
            from database import engine
            from sqlalchemy import text

            client = get_client(config["ig_username"], config["ig_password"])
            account_info = get_account_info(client)
            user_id = account_info["user_id"]

            # Get recent media (limit to 5 to save API calls)
            medias = get_user_medias(client, user_id, amount=5)

            with engine.connect() as conn:
                total_new_likes = 0

                for media in medias:
                    media_id = media["media_id"]
                    caption = media.get("caption", "")

                    # Get likers for this media
                    likers = get_media_likers(client, media_id)

                    # Get known likers for this media
                    result = conn.execute(
                        text("SELECT instagram_user_id FROM known_media_likes WHERE media_id = :mid"),
                        {"mid": media_id},
                    )
                    known_liker_ids = {row[0] for row in result.fetchall()}

                    for liker in likers:
                        lid = liker["user_id"]
                        if lid not in known_liker_ids:
                            # New like detected!
                            liker_username = liker.get("username", "")
                            total_new_likes += 1
                            self.new_likes_detected += 1

                            # Insert into known likes
                            conn.execute(
                                text(
                                    "INSERT INTO known_media_likes (media_id, instagram_user_id, instagram_username) "
                                    "VALUES (:mid, :uid, :uname) ON CONFLICT DO NOTHING"
                                ),
                                {"mid": media_id, "uid": lid, "uname": liker_username},
                            )

                            # Generate contextual comment
                            comment_text = generate_like_comment(liker_username, caption)
                            comment_success = post_comment(client, media_id, comment_text)

                            # Log conversation
                            log_conversation(
                                instagram_user_id=lid,
                                instagram_username=liker_username,
                                event_type="photo_like",
                                agent_action="posted_comment",
                                agent_message=comment_text,
                                trigger_media_id=media_id,
                                trigger_media_caption=caption[:200] if caption else "",
                            )

                            status = "posted" if comment_success else "failed"
                            log_activity(
                                "info",
                                f"@{liker_username} liked media - comment {status}",
                                comment_text,
                            )

                            # Delay between comments
                            await asyncio.sleep(5)

                    # Delay between media checks
                    await asyncio.sleep(2)

                conn.commit()

                if total_new_likes > 0:
                    log_activity("info", f"Detected {total_new_likes} new likes across {len(medias)} posts")
                else:
                    log_activity("info", "Like check complete - no new likes")

        except Exception as e:
            self.errors += 1
            logger.error(f"Like check error: {e}")
            log_activity("error", f"Like check error: {str(e)}")


# Singleton monitor instance
monitor = InstagramMonitor()
