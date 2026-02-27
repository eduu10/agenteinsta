import logging
from typing import List, Dict, Optional
from instagrapi import Client as InstaClient
from instagrapi.exceptions import LoginRequired, ChallengeRequired

logger = logging.getLogger(__name__)

# Singleton client instance
_client: Optional[InstaClient] = None
_logged_in = False


def get_client(username: str, password: str) -> InstaClient:
    """Get or create instagrapi client singleton."""
    global _client, _logged_in

    if _client and _logged_in:
        return _client

    _client = InstaClient()
    _client.delay_range = [2, 5]  # Random delay between requests to avoid detection

    try:
        _client.login(username, password)
        _logged_in = True
        logger.info(f"Logged in as @{username}")
    except ChallengeRequired:
        logger.error("Instagram challenge required - manual verification needed")
        raise
    except LoginRequired:
        logger.error("Login failed - check credentials")
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise

    return _client


def reset_client():
    """Force re-login on next call."""
    global _client, _logged_in
    _client = None
    _logged_in = False


def get_account_info(client: InstaClient) -> Dict:
    """Get info about the logged-in account."""
    user = client.account_info()
    return {
        "user_id": str(user.pk),
        "username": user.username,
        "full_name": user.full_name,
        "follower_count": user.follower_count,
        "media_count": user.media_count,
    }


def get_followers(client: InstaClient, user_id: str, amount: int = 50) -> List[Dict]:
    """Get list of followers."""
    try:
        followers = client.user_followers(int(user_id), amount=amount)
        return [
            {
                "user_id": str(uid),
                "username": user.username,
                "full_name": user.full_name,
            }
            for uid, user in followers.items()
        ]
    except Exception as e:
        logger.error(f"Error getting followers: {e}")
        return []


def get_user_medias(client: InstaClient, user_id: str, amount: int = 10) -> List[Dict]:
    """Get recent media posts for the account."""
    try:
        medias = client.user_medias(int(user_id), amount=amount)
        return [
            {
                "media_id": str(m.pk),
                "caption": m.caption_text or "",
                "media_type": str(m.media_type),
                "taken_at": str(m.taken_at),
                "like_count": m.like_count,
            }
            for m in medias
        ]
    except Exception as e:
        logger.error(f"Error getting media: {e}")
        return []


def get_media_likers(client: InstaClient, media_id: str) -> List[Dict]:
    """Get list of users who liked a specific media."""
    try:
        likers = client.media_likers(media_id)
        return [
            {
                "user_id": str(u.pk),
                "username": u.username,
            }
            for u in likers
        ]
    except Exception as e:
        logger.error(f"Error getting media likers: {e}")
        return []


def send_dm(client: InstaClient, user_ids: List[str], message: str) -> bool:
    """Send a direct message to one or more users."""
    try:
        result = client.direct_send(message, user_ids=[int(uid) for uid in user_ids])
        return result is not None
    except Exception as e:
        logger.error(f"Error sending DM: {e}")
        return False


def post_comment(client: InstaClient, media_id: str, text: str) -> bool:
    """Post a comment on a media post."""
    try:
        result = client.media_comment(media_id, text)
        return result is not None
    except Exception as e:
        logger.error(f"Error posting comment: {e}")
        return False


def test_connection(username: str, password: str) -> Dict:
    """Test Instagram connection with credentials."""
    try:
        reset_client()
        client = get_client(username, password)
        info = get_account_info(client)
        return {"success": True, "account": info}
    except Exception as e:
        return {"success": False, "error": str(e)}
