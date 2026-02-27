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
    }


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
