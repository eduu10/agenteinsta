from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# --- Agent Chat ---
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_id: Optional[str] = "dashboard_user"


class ChatResponse(BaseModel):
    response: str
    session_id: str


# --- Settings ---
class SettingsUpdate(BaseModel):
    app_id: Optional[str] = None
    app_secret: Optional[str] = None
    access_token: Optional[str] = None
    page_id: Optional[str] = None
    instagram_business_account_id: Optional[str] = None
    ig_username: Optional[str] = None
    ig_password: Optional[str] = None
    api_mode: Optional[str] = None
    polling_interval_seconds: Optional[int] = None
    monitor_enabled: Optional[bool] = None
    # Bot control
    welcome_dm_enabled: Optional[bool] = None
    auto_comment_enabled: Optional[bool] = None
    max_dms_per_day: Optional[int] = None
    max_comments_per_day: Optional[int] = None
    delay_between_dms: Optional[int] = None
    delay_between_comments: Optional[int] = None
    delay_between_media_checks: Optional[int] = None
    followers_per_check: Optional[int] = None
    media_posts_per_check: Optional[int] = None
    delay_randomization_max: Optional[int] = None


class SettingsResponse(BaseModel):
    app_id: str
    app_secret_masked: str
    access_token_masked: str
    page_id: str
    instagram_business_account_id: str
    ig_username: str
    ig_password_masked: str
    ig_session_active: bool
    api_mode: str
    polling_interval_seconds: int
    monitor_enabled: bool
    # Bot control
    welcome_dm_enabled: bool = True
    auto_comment_enabled: bool = True
    max_dms_per_day: int = 20
    max_comments_per_day: int = 20
    delay_between_dms: int = 45
    delay_between_comments: int = 60
    delay_between_media_checks: int = 5
    followers_per_check: int = 20
    media_posts_per_check: int = 3
    delay_randomization_max: int = 30
    dms_sent_today: int = 0
    comments_posted_today: int = 0


# --- Conversations ---
class ConversationItem(BaseModel):
    id: int
    instagram_user_id: str
    instagram_username: str
    event_type: str
    trigger_media_id: str
    trigger_media_caption: str
    agent_action: str
    agent_message: str
    session_id: str
    created_at: str


class ConversationListResponse(BaseModel):
    items: List[ConversationItem]
    total: int
    page: int
    limit: int


# --- Monitor ---
class MonitorStatus(BaseModel):
    running: bool
    last_poll: Optional[str] = None
    total_polls: int = 0
    new_followers_detected: int = 0
    new_likes_detected: int = 0
    errors: int = 0


# --- Activity Log ---
class ActivityLogItem(BaseModel):
    id: int
    level: str
    message: str
    details: str
    created_at: str


# --- Stats ---
class DashboardStats(BaseModel):
    total_conversations: int = 0
    total_dms_sent: int = 0
    total_comments_posted: int = 0
    total_followers_greeted: int = 0
    monitor_running: bool = False
