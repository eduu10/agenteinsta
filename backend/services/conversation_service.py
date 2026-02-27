from sqlalchemy import text
from database import engine


def log_conversation(
    user_id: str,
    instagram_user_id: str,
    instagram_username: str,
    event_type: str,
    agent_action: str,
    agent_message: str,
    trigger_media_id: str = "",
    trigger_media_caption: str = "",
    session_id: str = "",
) -> int:
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                INSERT INTO conversations
                (user_id, instagram_user_id, instagram_username, event_type, trigger_media_id,
                 trigger_media_caption, agent_action, agent_message, session_id)
                VALUES (:user_id, :uid, :uname, :etype, :mid, :mcap, :action, :msg, :sid)
                RETURNING id
            """),
            {
                "user_id": user_id,
                "uid": instagram_user_id,
                "uname": instagram_username,
                "etype": event_type,
                "mid": trigger_media_id,
                "mcap": trigger_media_caption,
                "action": agent_action,
                "msg": agent_message,
                "sid": session_id,
            },
        )
        conn.commit()
        return result.scalar()


def get_conversations(user_id: str, page: int = 1, limit: int = 20, event_type: str = None) -> dict:
    offset = (page - 1) * limit

    with engine.connect() as conn:
        where_clause = "WHERE user_id = :user_id"
        params = {"user_id": user_id, "limit": limit, "offset": offset}

        if event_type:
            where_clause += " AND event_type = :event_type"
            params["event_type"] = event_type

        count_result = conn.execute(
            text(f"SELECT COUNT(*) FROM conversations {where_clause}"),
            params,
        )
        total = count_result.scalar()

        result = conn.execute(
            text(f"""
                SELECT * FROM conversations {where_clause}
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            """),
            params,
        )
        rows = [dict(r) for r in result.mappings().all()]

        # Convert datetime to string
        for row in rows:
            if row.get("created_at"):
                row["created_at"] = str(row["created_at"])

        return {"items": rows, "total": total, "page": page, "limit": limit}


def get_conversation_by_id(user_id: str, conv_id: int) -> dict:
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM conversations WHERE id = :id AND user_id = :user_id"),
            {"id": conv_id, "user_id": user_id},
        )
        row = result.mappings().first()
        if not row:
            return None
        data = dict(row)
        if data.get("created_at"):
            data["created_at"] = str(data["created_at"])
        return data


def get_stats(user_id: str) -> dict:
    with engine.connect() as conn:
        total = conn.execute(
            text("SELECT COUNT(*) FROM conversations WHERE user_id = :uid"),
            {"uid": user_id},
        ).scalar()
        dms = conn.execute(
            text("SELECT COUNT(*) FROM conversations WHERE user_id = :uid AND agent_action = 'sent_dm'"),
            {"uid": user_id},
        ).scalar()
        comments = conn.execute(
            text("SELECT COUNT(*) FROM conversations WHERE user_id = :uid AND agent_action = 'posted_comment'"),
            {"uid": user_id},
        ).scalar()
        followers = conn.execute(
            text("SELECT COUNT(*) FROM conversations WHERE user_id = :uid AND event_type = 'new_follower'"),
            {"uid": user_id},
        ).scalar()

        return {
            "total_conversations": total,
            "total_dms_sent": dms,
            "total_comments_posted": comments,
            "total_followers_greeted": followers,
        }


def log_activity(user_id: str, level: str, message: str, details: str = ""):
    with engine.connect() as conn:
        conn.execute(
            text("""
                INSERT INTO activity_log (user_id, level, message, details)
                VALUES (:user_id, :level, :message, :details)
            """),
            {"user_id": user_id, "level": level, "message": message, "details": details},
        )
        conn.commit()


def get_activity_log(user_id: str, limit: int = 50) -> list:
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM activity_log WHERE user_id = :uid ORDER BY created_at DESC LIMIT :limit"),
            {"uid": user_id, "limit": limit},
        )
        rows = [dict(r) for r in result.mappings().all()]
        for row in rows:
            if row.get("created_at"):
                row["created_at"] = str(row["created_at"])
        return rows
