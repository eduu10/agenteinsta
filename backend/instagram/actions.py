"""Action executor that delegates to the active Instagram client (instagrapi or Graph API)."""
import logging
from typing import Dict, List
from services.config_service import get_config

logger = logging.getLogger(__name__)


def _get_instagrapi_client():
    """Get configured instagrapi client."""
    from instagram.instagrapi_client import get_client
    config = get_config()
    username = config.get("ig_username", "")
    password = config.get("ig_password", "")
    session_data = config.get("ig_session", "")
    if not username or (not password and not session_data):
        raise ValueError("Instagram credentials not configured. Use the local login script to generate a session.")
    return get_client(username, password, session_data)


def _get_graph_api_client():
    """Get configured Graph API client."""
    from instagram.graph_api import InstagramGraphAPI
    config = get_config()
    token = config.get("access_token", "")
    ig_id = config.get("instagram_business_account_id", "")
    page_id = config.get("page_id", "")
    if not token:
        raise ValueError("Instagram access token not configured")
    return InstagramGraphAPI(token, ig_id, page_id)


def send_direct_message(user_id: str, message: str) -> str:
    """Send a DM to a user. Returns status string."""
    config = get_config()
    api_mode = config.get("api_mode", "instagrapi")

    try:
        if api_mode == "instagrapi":
            client = _get_instagrapi_client()
            from instagram.instagrapi_client import send_dm
            success = send_dm(client, [user_id], message)
            return f"DM sent successfully to user {user_id}" if success else f"Failed to send DM to user {user_id}"
        else:
            client = _get_graph_api_client()
            result = client.send_message(user_id, message)
            if "error" in result:
                return f"Failed to send DM: {result['error']}"
            return f"DM sent successfully to user {user_id}"
    except Exception as e:
        logger.error(f"send_direct_message error: {e}")
        return f"Error sending DM: {str(e)}"


def post_comment_on_media(media_id: str, comment_text: str) -> str:
    """Post a comment on a media post. Returns status string."""
    config = get_config()
    api_mode = config.get("api_mode", "instagrapi")

    try:
        if api_mode == "instagrapi":
            client = _get_instagrapi_client()
            from instagram.instagrapi_client import post_comment
            success = post_comment(client, media_id, comment_text)
            return f"Comment posted on media {media_id}" if success else f"Failed to comment on media {media_id}"
        else:
            client = _get_graph_api_client()
            result = client.post_comment(media_id, comment_text)
            if "error" in result:
                return f"Failed to comment: {result['error']}"
            return f"Comment posted on media {media_id}"
    except Exception as e:
        logger.error(f"post_comment_on_media error: {e}")
        return f"Error posting comment: {str(e)}"


def get_media_details(media_id: str) -> str:
    """Get info about a media post."""
    config = get_config()
    try:
        if config.get("api_mode") == "instagrapi":
            client = _get_instagrapi_client()
            info = client.media_info(media_id)
            return f"Media: caption='{info.caption_text}', likes={info.like_count}, type={info.media_type}"
        else:
            client = _get_graph_api_client()
            media_list = client.get_media_list(limit=50)
            for m in media_list:
                if m.get("id") == media_id:
                    return f"Media: caption='{m.get('caption', '')}', likes={m.get('like_count', 0)}"
            return f"Media {media_id} not found"
    except Exception as e:
        return f"Error getting media details: {str(e)}"


def get_followers_list() -> str:
    """Get recent followers list."""
    config = get_config()
    try:
        if config.get("api_mode") == "instagrapi":
            client = _get_instagrapi_client()
            from instagram.instagrapi_client import get_account_info, get_followers
            info = get_account_info(client)
            followers = get_followers(client, info["user_id"], amount=20)
            follower_names = [f"@{f['username']}" for f in followers]
            return f"Recent followers ({len(followers)}): {', '.join(follower_names)}"
        else:
            client = _get_graph_api_client()
            info = client.get_account_info()
            count = info.get("followers_count", 0)
            return f"Total followers: {count} (Graph API doesn't provide individual follower list)"
    except Exception as e:
        return f"Error getting followers: {str(e)}"
