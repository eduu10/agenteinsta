import asyncio
import logging
import random
from datetime import datetime
from typing import Optional, Dict

from services.config_service import get_config, increment_daily_counter, reset_daily_counters_if_needed
from services.conversation_service import log_conversation, log_activity
from agent.instagram_agent import generate_greeting, generate_like_comment

logger = logging.getLogger(__name__)


class InstagramMonitor:
    def __init__(self, user_id: str):
        self.user_id = user_id
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

    async def _delay(self, base_seconds: int, randomization_max: int):
        """Sleep for base_seconds + random(0, randomization_max) seconds."""
        extra = random.randint(0, max(0, randomization_max))
        total = max(1, base_seconds + extra)
        await asyncio.sleep(total)

    async def start(self):
        if self._running:
            return {"status": "already_running"}

        config = get_config(self.user_id)
        self.interval = config.get("polling_interval_seconds", 60)

        # Validate config
        api_mode = config.get("api_mode", "instagrapi")
        if api_mode == "instagrapi":
            if not config.get("ig_username") or (not config.get("ig_password") and not config.get("ig_session")):
                return {"status": "error", "message": "Instagram credentials not configured. Use the local login script to import a session."}
        else:
            if not config.get("access_token"):
                return {"status": "error", "message": "Instagram access token not configured"}

        # LLM key comes from global config
        from services.config_service import get_global_config
        global_cfg = get_global_config()
        if not global_cfg.get("llm_api_key"):
            return {"status": "error", "message": "LLM API key not configured (contact admin)"}

        self._running = True
        self._task = asyncio.create_task(self._poll_loop())
        await asyncio.to_thread(log_activity, self.user_id, "info", "Monitor started", f"Polling every {self.interval}s")
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
        await asyncio.to_thread(log_activity, self.user_id, "info", "Monitor stopped")
        return {"status": "stopped"}

    async def _poll_loop(self):
        """Main polling loop."""
        while self._running:
            try:
                # Reset daily counters if 24h have passed
                await asyncio.to_thread(reset_daily_counters_if_needed, self.user_id)

                self.last_poll = datetime.utcnow().isoformat()
                self.total_polls += 1

                config = get_config(self.user_id)
                self.interval = config.get("polling_interval_seconds", 60)

                # Alternate between checking followers and likes
                if self.total_polls % 2 == 1:
                    if config.get("welcome_dm_enabled", True):
                        await self._check_new_followers()
                    else:
                        await asyncio.to_thread(
                            log_activity, self.user_id, "info", "Follower check skipped - welcome DMs disabled"
                        )
                else:
                    if config.get("auto_comment_enabled", True):
                        await self._check_media_likes()
                    else:
                        await asyncio.to_thread(
                            log_activity, self.user_id, "info", "Like check skipped - auto-comments disabled"
                        )

            except Exception as e:
                self.errors += 1
                logger.error(f"[{self.user_id}] Monitor poll error: {e}")
                try:
                    await asyncio.to_thread(log_activity, self.user_id, "error", f"Poll error: {str(e)}")
                except Exception:
                    pass

            await asyncio.sleep(self.interval)

    async def _check_new_followers(self):
        """Detect new followers and send greeting DMs."""
        config = get_config(self.user_id)
        if config.get("api_mode") != "instagrapi":
            await asyncio.to_thread(log_activity, self.user_id, "info", "Follower check skipped - Graph API doesn't support follower list")
            return

        try:
            from instagram.instagrapi_client import get_client, get_account_info, get_followers, send_dm
            from database import engine
            from sqlalchemy import text

            session_data = config.get("ig_session", "")
            client = await asyncio.to_thread(
                get_client, self.user_id, config["ig_username"], config["ig_password"], session_data
            )
            account_info = await asyncio.to_thread(get_account_info, client)
            ig_user_id = account_info["user_id"]

            # Use configurable limit
            followers_limit = config.get("followers_per_check", 20)
            current_followers = await asyncio.to_thread(get_followers, client, ig_user_id, followers_limit)

            def _db_get_known_followers():
                with engine.connect() as conn:
                    result = conn.execute(
                        text("SELECT instagram_user_id FROM known_followers WHERE user_id = :uid"),
                        {"uid": self.user_id},
                    )
                    return {row[0] for row in result.fetchall()}

            known_ids = await asyncio.to_thread(_db_get_known_followers)

            max_dms = config.get("max_dms_per_day", 20)
            delay_dms = config.get("delay_between_dms", 45)
            randomization = config.get("delay_randomization_max", 30)

            new_count = 0
            for follower in current_followers:
                fid = follower["user_id"]
                if fid not in known_ids:
                    username = follower.get("username", "")
                    new_count += 1
                    self.new_followers_detected += 1

                    # Insert into known followers
                    def _db_insert_follower(uid, uname):
                        with engine.connect() as conn:
                            conn.execute(
                                text("INSERT INTO known_followers (user_id, instagram_user_id, instagram_username) VALUES (:owner, :uid, :uname) ON CONFLICT DO NOTHING"),
                                {"owner": self.user_id, "uid": uid, "uname": uname},
                            )
                            conn.commit()

                    await asyncio.to_thread(_db_insert_follower, fid, username)

                    # Check daily DM limit
                    current_count = config.get("dms_sent_today", 0)
                    if current_count >= max_dms:
                        await asyncio.to_thread(
                            log_activity, self.user_id, "warning",
                            f"Daily DM limit reached ({max_dms}). Skipping DM to @{username}."
                        )
                        break

                    # Generate and send greeting
                    greeting = await asyncio.to_thread(generate_greeting, username)
                    dm_success = await asyncio.to_thread(send_dm, client, [fid], greeting)

                    if dm_success:
                        await asyncio.to_thread(increment_daily_counter, self.user_id, "dms_sent_today")

                    # Log the conversation
                    await asyncio.to_thread(
                        log_conversation,
                        user_id=self.user_id,
                        instagram_user_id=fid,
                        instagram_username=username,
                        event_type="new_follower",
                        agent_action="sent_dm",
                        agent_message=greeting,
                    )

                    status = "sent" if dm_success else "failed"
                    await asyncio.to_thread(
                        log_activity, self.user_id, "info", f"New follower @{username} - DM {status}", greeting
                    )

                    # Configurable delay with randomization
                    await self._delay(delay_dms, randomization)

                    # Re-read config for updated counter
                    config = get_config(self.user_id)

            if new_count > 0:
                await asyncio.to_thread(log_activity, self.user_id, "info", f"Detected {new_count} new followers")
            else:
                await asyncio.to_thread(log_activity, self.user_id, "info", "Follower check complete - no new followers")

        except Exception as e:
            self.errors += 1
            logger.error(f"[{self.user_id}] Follower check error: {e}")
            await asyncio.to_thread(log_activity, self.user_id, "error", f"Follower check error: {str(e)}")

    async def _check_media_likes(self):
        """Detect new likes on posts and post contextual comments."""
        config = get_config(self.user_id)
        if config.get("api_mode") != "instagrapi":
            await asyncio.to_thread(log_activity, self.user_id, "info", "Like check skipped - Graph API doesn't support liker list")
            return

        try:
            from instagram.instagrapi_client import (
                get_client, get_account_info, get_user_medias,
                get_media_likers, post_comment,
            )
            from database import engine
            from sqlalchemy import text

            session_data = config.get("ig_session", "")
            client = await asyncio.to_thread(
                get_client, self.user_id, config["ig_username"], config["ig_password"], session_data
            )
            account_info = await asyncio.to_thread(get_account_info, client)
            ig_user_id = account_info["user_id"]

            # Use configurable limit
            media_limit = config.get("media_posts_per_check", 3)
            medias = await asyncio.to_thread(get_user_medias, client, ig_user_id, media_limit)

            max_comments = config.get("max_comments_per_day", 20)
            delay_comments = config.get("delay_between_comments", 60)
            delay_media = config.get("delay_between_media_checks", 5)
            randomization = config.get("delay_randomization_max", 30)

            total_new_likes = 0
            daily_limit_hit = False

            for media in medias:
                if daily_limit_hit:
                    break

                media_id = media["media_id"]
                caption = media.get("caption", "")

                # Get likers for this media
                likers = await asyncio.to_thread(get_media_likers, client, media_id)

                # Get known likers for this media
                def _db_get_known_likers(mid):
                    with engine.connect() as conn:
                        result = conn.execute(
                            text("SELECT instagram_user_id FROM known_media_likes WHERE user_id = :uid AND media_id = :mid"),
                            {"uid": self.user_id, "mid": mid},
                        )
                        return {row[0] for row in result.fetchall()}

                known_liker_ids = await asyncio.to_thread(_db_get_known_likers, media_id)

                for liker in likers:
                    lid = liker["user_id"]
                    if lid not in known_liker_ids:
                        liker_username = liker.get("username", "")
                        total_new_likes += 1
                        self.new_likes_detected += 1

                        # Insert into known likes
                        def _db_insert_like(mid, uid, uname):
                            with engine.connect() as conn:
                                conn.execute(
                                    text(
                                        "INSERT INTO known_media_likes (user_id, media_id, instagram_user_id, instagram_username) "
                                        "VALUES (:owner, :mid, :uid, :uname) ON CONFLICT DO NOTHING"
                                    ),
                                    {"owner": self.user_id, "mid": mid, "uid": uid, "uname": uname},
                                )
                                conn.commit()

                        await asyncio.to_thread(_db_insert_like, media_id, lid, liker_username)

                        # Check daily comment limit
                        current_config = get_config(self.user_id)
                        if current_config.get("comments_posted_today", 0) >= max_comments:
                            await asyncio.to_thread(
                                log_activity, self.user_id, "warning",
                                f"Daily comment limit reached ({max_comments}). Stopping comments."
                            )
                            daily_limit_hit = True
                            break

                        # Generate contextual comment
                        comment_text = await asyncio.to_thread(generate_like_comment, liker_username, caption)
                        comment_success = await asyncio.to_thread(post_comment, client, media_id, comment_text)

                        if comment_success:
                            await asyncio.to_thread(increment_daily_counter, self.user_id, "comments_posted_today")

                        # Log conversation
                        await asyncio.to_thread(
                            log_conversation,
                            user_id=self.user_id,
                            instagram_user_id=lid,
                            instagram_username=liker_username,
                            event_type="photo_like",
                            agent_action="posted_comment",
                            agent_message=comment_text,
                            trigger_media_id=media_id,
                            trigger_media_caption=caption[:200] if caption else "",
                        )

                        status = "posted" if comment_success else "failed"
                        await asyncio.to_thread(
                            log_activity, self.user_id, "info",
                            f"@{liker_username} liked media - comment {status}",
                            comment_text,
                        )

                        # Configurable delay with randomization
                        await self._delay(delay_comments, randomization)

                # Delay between media checks
                await self._delay(delay_media, randomization)

            if total_new_likes > 0:
                await asyncio.to_thread(log_activity, self.user_id, "info", f"Detected {total_new_likes} new likes across {len(medias)} posts")
            else:
                await asyncio.to_thread(log_activity, self.user_id, "info", "Like check complete - no new likes")

        except Exception as e:
            self.errors += 1
            logger.error(f"[{self.user_id}] Like check error: {e}")
            await asyncio.to_thread(log_activity, self.user_id, "error", f"Like check error: {str(e)}")


class MonitorManager:
    """Manages per-user monitor instances."""

    def __init__(self):
        self._monitors: Dict[str, InstagramMonitor] = {}

    def get_or_create(self, user_id: str) -> InstagramMonitor:
        if user_id not in self._monitors:
            self._monitors[user_id] = InstagramMonitor(user_id)
        return self._monitors[user_id]

    def get_status(self, user_id: str) -> dict:
        monitor = self._monitors.get(user_id)
        if not monitor:
            return {
                "running": False,
                "last_poll": None,
                "total_polls": 0,
                "new_followers_detected": 0,
                "new_likes_detected": 0,
                "errors": 0,
            }
        return monitor.get_status()

    async def start(self, user_id: str) -> dict:
        monitor = self.get_or_create(user_id)
        return await monitor.start()

    async def stop(self, user_id: str) -> dict:
        monitor = self._monitors.get(user_id)
        if not monitor:
            return {"status": "not_running"}
        return await monitor.stop()

    async def stop_all(self):
        """Stop all monitors (used on shutdown)."""
        for user_id, monitor in list(self._monitors.items()):
            if monitor.is_running:
                await monitor.stop()

    def get_all_statuses(self) -> list:
        """Get status of all monitors (admin)."""
        result = []
        for user_id, monitor in self._monitors.items():
            status = monitor.get_status()
            status["user_id"] = user_id
            result.append(status)
        return result


# Singleton manager instance
monitor_manager = MonitorManager()
