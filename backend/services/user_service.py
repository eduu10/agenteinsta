from sqlalchemy import text
from database import engine
from auth import hash_password, verify_password


def create_user(email: str, password: str, name: str = "") -> dict:
    pw_hash = hash_password(password)
    with engine.connect() as conn:
        # Check if this is the first user (make admin)
        count_result = conn.execute(text("SELECT COUNT(*) FROM users"))
        is_first = count_result.scalar() == 0

        result = conn.execute(
            text("""
                INSERT INTO users (email, password_hash, name, is_admin)
                VALUES (:email, :pw, :name, :is_admin)
                RETURNING id, email, name, is_admin, is_active, created_at
            """),
            {"email": email.lower().strip(), "pw": pw_hash, "name": name, "is_admin": is_first},
        )
        row = result.mappings().first()
        conn.commit()

        user = dict(row)
        user["id"] = str(user["id"])
        user["created_at"] = str(user["created_at"])

        # Create default instagram_config for this user
        conn2 = engine.connect()
        conn2.execute(
            text("""
                INSERT INTO instagram_config (user_id, api_mode)
                VALUES (:uid, 'instagrapi')
                ON CONFLICT (user_id) DO NOTHING
            """),
            {"uid": user["id"]},
        )
        conn2.commit()
        conn2.close()

        return user


def authenticate(email: str, password: str) -> dict:
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, email, password_hash, name, is_admin, is_active, created_at FROM users WHERE email = :email"),
            {"email": email.lower().strip()},
        )
        row = result.mappings().first()

    if not row:
        return None

    user = dict(row)
    if not verify_password(password, user["password_hash"]):
        return None

    if not user.get("is_active", True):
        return None

    user["id"] = str(user["id"])
    user["created_at"] = str(user["created_at"])
    del user["password_hash"]
    return user


def get_user(user_id: str) -> dict:
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, email, name, is_admin, is_active, created_at FROM users WHERE id = :uid"),
            {"uid": user_id},
        )
        row = result.mappings().first()

    if not row:
        return None

    user = dict(row)
    user["id"] = str(user["id"])
    user["created_at"] = str(user["created_at"])
    return user


def list_users() -> list:
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT
                u.id, u.email, u.name, u.is_admin, u.is_active, u.created_at,
                COALESCE(ic.ig_username, '') as ig_username,
                (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) as total_conversations,
                (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id AND c.agent_action = 'sent_dm') as total_dms,
                (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id AND c.agent_action = 'posted_comment') as total_comments
            FROM users u
            LEFT JOIN instagram_config ic ON ic.user_id = u.id
            ORDER BY u.created_at DESC
        """))
        rows = []
        for r in result.mappings().all():
            user = dict(r)
            user["id"] = str(user["id"])
            user["created_at"] = str(user["created_at"])
            rows.append(user)
        return rows
