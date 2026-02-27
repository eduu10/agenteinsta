from fastapi import APIRouter, HTTPException
from models.schemas import SettingsUpdate, SettingsResponse
from services.config_service import get_config_masked, update_config, get_config

router = APIRouter()


@router.get("", response_model=SettingsResponse)
def get_settings():
    config = get_config_masked()
    if not config:
        raise HTTPException(status_code=404, detail="No configuration found")
    return SettingsResponse(**config)


@router.put("")
def update_settings(data: SettingsUpdate):
    try:
        update_config(data.model_dump(exclude_none=True))
        # Reset instagrapi client if credentials changed
        if data.ig_username or data.ig_password:
            from instagram.instagrapi_client import reset_client
            reset_client()
        return {"status": "ok", "message": "Settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-connection")
def test_connection():
    config = get_config()
    api_mode = config.get("api_mode", "instagrapi")

    try:
        if api_mode == "instagrapi":
            username = config.get("ig_username", "")
            password = config.get("ig_password", "")
            if not username or not password:
                return {"success": False, "error": "Instagram username/password not configured"}
            from instagram.instagrapi_client import test_connection
            return test_connection(username, password)
        else:
            token = config.get("access_token", "")
            ig_id = config.get("instagram_business_account_id", "")
            page_id = config.get("page_id", "")
            if not token:
                return {"success": False, "error": "Access token not configured"}
            from instagram.graph_api import InstagramGraphAPI
            client = InstagramGraphAPI(token, ig_id, page_id)
            return client.test_connection()
    except Exception as e:
        return {"success": False, "error": str(e)}
