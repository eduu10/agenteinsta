import httpx
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v19.0"


class InstagramGraphAPI:
    def __init__(self, access_token: str, ig_account_id: str, page_id: str):
        self.access_token = access_token
        self.ig_account_id = ig_account_id
        self.page_id = page_id
        self.client = httpx.Client(timeout=30)

    def get_media_list(self, limit: int = 25) -> List[Dict]:
        """GET /{ig-user-id}/media"""
        try:
            url = f"{GRAPH_API_BASE}/{self.ig_account_id}/media"
            params = {
                "fields": "id,caption,media_type,media_url,timestamp,like_count",
                "limit": limit,
                "access_token": self.access_token,
            }
            resp = self.client.get(url, params=params)
            data = resp.json()
            return data.get("data", [])
        except Exception as e:
            logger.error(f"Graph API error (get_media_list): {e}")
            return []

    def post_comment(self, media_id: str, message: str) -> Dict:
        """POST /{media-id}/comments"""
        try:
            url = f"{GRAPH_API_BASE}/{media_id}/comments"
            data = {"message": message, "access_token": self.access_token}
            resp = self.client.post(url, data=data)
            return resp.json()
        except Exception as e:
            logger.error(f"Graph API error (post_comment): {e}")
            return {"error": str(e)}

    def send_message(self, recipient_id: str, message: str) -> Dict:
        """Send DM via Instagram Messaging API."""
        try:
            url = f"{GRAPH_API_BASE}/{self.page_id}/messages"
            data = {
                "recipient": {"id": recipient_id},
                "message": {"text": message},
                "access_token": self.access_token,
            }
            resp = self.client.post(url, json=data)
            return resp.json()
        except Exception as e:
            logger.error(f"Graph API error (send_message): {e}")
            return {"error": str(e)}

    def get_account_info(self) -> Dict:
        """GET /{ig-user-id}?fields=..."""
        try:
            url = f"{GRAPH_API_BASE}/{self.ig_account_id}"
            params = {
                "fields": "id,username,name,followers_count,media_count",
                "access_token": self.access_token,
            }
            resp = self.client.get(url, params=params)
            return resp.json()
        except Exception as e:
            logger.error(f"Graph API error (get_account_info): {e}")
            return {"error": str(e)}

    def test_connection(self) -> Dict:
        """Test the API connection."""
        try:
            info = self.get_account_info()
            if "error" in info:
                return {"success": False, "error": info["error"]}
            return {"success": True, "account": info}
        except Exception as e:
            return {"success": False, "error": str(e)}
