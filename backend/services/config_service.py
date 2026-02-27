from sqlalchemy import text
from database import engine


def mask_secret(value: str) -> str:
    if not value or len(value) < 8:
        return "****" if value else ""
    return value[:4] + "****" + value[-4:]


def get_config() -> dict:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM instagram_config ORDER BY id LIMIT 1"))
        row = result.mappings().first()
        if not row:
            return {}
        return dict(row)


def get_config_masked() -> dict:
    config = get_config()
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
        "llm_provider": config.get("llm_provider", "groq"),
        "llm_api_key_masked": mask_secret(config.get("llm_api_key", "")),
        "llm_model": config.get("llm_model", "llama-3.3-70b-versatile"),
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


def increment_daily_counter(counter_name: str) -> int:
    """Atomically increment a daily counter and return the new value."""
    if counter_name not in VALID_COUNTERS:
        raise ValueError(f"Invalid counter: {counter_name}")
    with engine.connect() as conn:
        result = conn.execute(
            text(f"""
                UPDATE instagram_config
                SET {counter_name} = {counter_name} + 1, updated_at = NOW()
                WHERE id = (SELECT id FROM instagram_config ORDER BY id LIMIT 1)
                RETURNING {counter_name}
            """)
        )
        conn.commit()
        return result.scalar()


def reset_daily_counters_if_needed() -> bool:
    """Reset daily counters if 24h have passed. Returns True if reset occurred."""
    with engine.connect() as conn:
        result = conn.execute(text("""
            UPDATE instagram_config
            SET dms_sent_today = 0,
                comments_posted_today = 0,
                daily_counters_reset_at = NOW(),
                updated_at = NOW()
            WHERE id = (SELECT id FROM instagram_config ORDER BY id LIMIT 1)
              AND daily_counters_reset_at < NOW() - INTERVAL '24 hours'
            RETURNING id
        """))
        conn.commit()
        row = result.first()
        return row is not None


def update_config(data: dict) -> dict:
    # Filter out None values
    updates = {k: v for k, v in data.items() if v is not None}
    if not updates:
        return get_config()

    set_clauses = []
    params = {}
    for key, value in updates.items():
        set_clauses.append(f"{key} = :{key}")
        params[key] = value

    set_clauses.append("updated_at = NOW()")
    set_sql = ", ".join(set_clauses)

    with engine.connect() as conn:
        conn.execute(
            text(f"UPDATE instagram_config SET {set_sql} WHERE id = (SELECT id FROM instagram_config ORDER BY id LIMIT 1)"),
            params,
        )
        conn.commit()

    return get_config()
