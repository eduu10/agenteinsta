from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from config import settings

engine = create_engine(settings.get_database_url(), pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create custom application tables if they don't exist."""
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS instagram_config (
                id SERIAL PRIMARY KEY,
                app_id TEXT DEFAULT '',
                app_secret TEXT DEFAULT '',
                access_token TEXT DEFAULT '',
                page_id TEXT DEFAULT '',
                instagram_business_account_id TEXT DEFAULT '',
                ig_username TEXT DEFAULT '',
                ig_password TEXT DEFAULT '',
                api_mode TEXT DEFAULT 'instagrapi',
                llm_provider TEXT DEFAULT 'groq',
                llm_api_key TEXT DEFAULT '',
                llm_model TEXT DEFAULT 'llama-3.3-70b-versatile',
                polling_interval_seconds INTEGER DEFAULT 60,
                monitor_enabled BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                instagram_user_id TEXT NOT NULL,
                instagram_username TEXT DEFAULT '',
                event_type TEXT NOT NULL,
                trigger_media_id TEXT DEFAULT '',
                trigger_media_caption TEXT DEFAULT '',
                agent_action TEXT NOT NULL,
                agent_message TEXT NOT NULL,
                session_id TEXT DEFAULT '',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS known_followers (
                id SERIAL PRIMARY KEY,
                instagram_user_id TEXT UNIQUE NOT NULL,
                instagram_username TEXT DEFAULT '',
                first_seen_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS known_media_likes (
                id SERIAL PRIMARY KEY,
                media_id TEXT NOT NULL,
                instagram_user_id TEXT NOT NULL,
                instagram_username TEXT DEFAULT '',
                first_seen_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(media_id, instagram_user_id)
            )
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS activity_log (
                id SERIAL PRIMARY KEY,
                level TEXT DEFAULT 'info',
                message TEXT NOT NULL,
                details TEXT DEFAULT '',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))

        # Insert default config row if none exists
        result = conn.execute(text("SELECT COUNT(*) FROM instagram_config"))
        count = result.scalar()
        if count == 0:
            conn.execute(text(
                "INSERT INTO instagram_config (api_mode, llm_provider, llm_model) "
                "VALUES ('instagrapi', 'groq', 'llama-3.3-70b-versatile')"
            ))

        conn.commit()
