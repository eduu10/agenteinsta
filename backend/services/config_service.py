from sqlalchemy import text
from database import engine


def mask_secret(value: str) -> str:
    if not value or len(value) < 8:
        return "****" if value else ""
    return value[:4] + "****" + value[-4:]


# ========== GLOBAL CONFIG (shared LLM) ==========

def get_global_config() -> dict:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM global_config ORDER BY id LIMIT 1"))
        row = result.mappings().first()
        if not row:
            return {}
        return dict(row)


def update_global_config(data: dict):
    updates = {k: v for k, v in data.items() if v is not None}
    if not updates:
        return
    set_clauses = []
    params = {}
    for key, value in updates.items():
        set_clauses.append(f"{key} = :{key}")
        params[key] = value
    set_clauses.append("updated_at = NOW()")
    set_sql = ", ".join(set_clauses)

    with engine.connect() as conn:
        conn.execute(
            text(f"UPDATE global_config SET {set_sql} WHERE id = (SELECT id FROM global_config ORDER BY id LIMIT 1)"),
            params,
        )
        conn.commit()


# ========== PER-USER CONFIG ==========

def get_config(user_id: str) -> dict:
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM instagram_config WHERE user_id = :uid LIMIT 1"),
            {"uid": user_id},
        )
        row = result.mappings().first()
        if not row:
            return {}
        return dict(row)


def get_config_masked(user_id: str) -> dict:
    config = get_config(user_id)
    if not config:
        return {}
    return {
        "app_id": config.get("app_id", ""),
        "app_secret_masked": mask_secret(config.get("app_secret", "")),
        "access_token_masked": mask_secret(config.get("access_token", "")),
        "page_id": config.get("page_id", ""),
        "instagram_business_account_id": config.get("instagram_business_account_id", ""),
        "ig_username": config.get("ig_username", ""),
        "ig_password_masked": mask_secret(config.get("ig_password", "")),
        "ig_session_active": bool(config.get("ig_session", "")),
        "api_mode": config.get("api_mode", "instagrapi"),
        "polling_interval_seconds": config.get("polling_interval_seconds", 60),
        "monitor_enabled": config.get("monitor_enabled", False),
        # Bot control
        "welcome_dm_enabled": config.get("welcome_dm_enabled", True),
        "auto_comment_enabled": config.get("auto_comment_enabled", True),
        "max_dms_per_day": config.get("max_dms_per_day", 20),
        "max_comments_per_day": config.get("max_comments_per_day", 20),
        "delay_between_dms": config.get("delay_between_dms", 45),
        "delay_between_comments": config.get("delay_between_comments", 60),
        "delay_between_media_checks": config.get("delay_between_media_checks", 5),
        "followers_per_check": config.get("followers_per_check", 20),
        "media_posts_per_check": config.get("media_posts_per_check", 3),
        "delay_randomization_max": config.get("delay_randomization_max", 30),
        "dms_sent_today": config.get("dms_sent_today", 0),
        "comments_posted_today": config.get("comments_posted_today", 0),
    }


VALID_COUNTERS = {"dms_sent_today", "comments_posted_today"}


def increment_daily_counter(user_id: str, counter_name: str) -> int:
    """Atomically increment a daily counter and return the new value."""
    if counter_name not in VALID_COUNTERS:
        raise ValueError(f"Invalid counter: {counter_name}")
    with engine.connect() as conn:
        result = conn.execute(
            text(f"""
                UPDATE instagram_config
                SET {counter_name} = {counter_name} + 1, updated_at = NOW()
                WHERE user_id = :uid
                RETURNING {counter_name}
            """),
            {"uid": user_id},
        )
        conn.commit()
        return result.scalar()


def reset_daily_counters_if_needed(user_id: str) -> bool:
    """Reset daily counters if 24h have passed. Returns True if reset occurred."""
    with engine.connect() as conn:
        result = conn.execute(text("""
            UPDATE instagram_config
            SET dms_sent_today = 0,
                comments_posted_today = 0,
                daily_counters_reset_at = NOW(),
                updated_at = NOW()
            WHERE user_id = :uid
              AND daily_counters_reset_at < NOW() - INTERVAL '24 hours'
            RETURNING id
        """), {"uid": user_id})
        conn.commit()
        row = result.first()
        return row is not None


def update_config(user_id: str, data: dict) -> dict:
    # Filter out None values
    updates = {k: v for k, v in data.items() if v is not None}
    if not updates:
        return get_config(user_id)

    set_clauses = []
    params = {"uid": user_id}
    for key, value in updates.items():
        set_clauses.append(f"{key} = :{key}")
        params[key] = value

    set_clauses.append("updated_at = NOW()")
    set_sql = ", ".join(set_clauses)

    with engine.connect() as conn:
        conn.execute(
            text(f"UPDATE instagram_config SET {set_sql} WHERE user_id = :uid"),
            params,
        )
        conn.commit()

    return get_config(user_id)


def create_config_for_user(user_id: str):
    """Create default config for a new user."""
    with engine.connect() as conn:
        conn.execute(
            text("""
                INSERT INTO instagram_config (user_id, api_mode)
                VALUES (:uid, 'instagrapi')
                ON CONFLICT (user_id) DO NOTHING
            """),
            {"uid": user_id},
        )
        conn.commit()
