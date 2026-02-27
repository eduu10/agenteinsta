import logging
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker
from config import settings

logger = logging.getLogger(__name__)


def _build_engine():
    if settings.db_password and settings.db_host:
        url = URL.create(
            drivername="postgresql",
            username=settings.db_user,
            password=settings.db_password,
            host=settings.db_host,
            port=int(settings.db_port),
            database=settings.db_name,
        )
        logger.info(f"Connecting to DB host: {settings.db_host}:{settings.db_port}")
    else:
        url = settings.database_url
        logger.info("Connecting to DB from DATABASE_URL")
    return create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=10)


engine = _build_engine()
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
        # Enable uuid generation
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))

        # ========== USERS TABLE ==========
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT DEFAULT '',
                is_admin BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))

        # ========== GLOBAL CONFIG TABLE (shared LLM settings) ==========
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS global_config (
                id SERIAL PRIMARY KEY,
                llm_provider TEXT DEFAULT 'groq',
                llm_api_key TEXT DEFAULT '',
                llm_model TEXT DEFAULT 'llama-3.3-70b-versatile',
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))

        # Insert default global config if none exists
        result = conn.execute(text("SELECT COUNT(*) FROM global_config"))
        if result.scalar() == 0:
            conn.execute(text(
                "INSERT INTO global_config (llm_provider, llm_api_key, llm_model) "
                "VALUES ('groq', '', 'llama-3.3-70b-versatile')"
            ))

        # ========== INSTAGRAM CONFIG (per-user) ==========
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

        # ========== MIGRATIONS ==========

        # Add ig_session column if it doesn't exist
        conn.execute(text("""
            DO $$ BEGIN
                ALTER TABLE instagram_config ADD COLUMN IF NOT EXISTS ig_session TEXT DEFAULT '';
            EXCEPTION WHEN duplicate_column THEN NULL;
            END $$;
        """))

        # Bot control settings migration
        bot_control_columns = [
            ("welcome_dm_enabled", "BOOLEAN DEFAULT true"),
            ("auto_comment_enabled", "BOOLEAN DEFAULT true"),
            ("max_dms_per_day", "INTEGER DEFAULT 20"),
            ("max_comments_per_day", "INTEGER DEFAULT 20"),
            ("delay_between_dms", "INTEGER DEFAULT 45"),
            ("delay_between_comments", "INTEGER DEFAULT 60"),
            ("delay_between_media_checks", "INTEGER DEFAULT 5"),
            ("followers_per_check", "INTEGER DEFAULT 20"),
            ("media_posts_per_check", "INTEGER DEFAULT 3"),
            ("delay_randomization_max", "INTEGER DEFAULT 30"),
            ("dms_sent_today", "INTEGER DEFAULT 0"),
            ("comments_posted_today", "INTEGER DEFAULT 0"),
            ("daily_counters_reset_at", "TIMESTAMPTZ DEFAULT NOW()"),
        ]
        for col_name, col_def in bot_control_columns:
            conn.execute(text(f"""
                DO $$ BEGIN
                    ALTER TABLE instagram_config ADD COLUMN IF NOT EXISTS {col_name} {col_def};
                EXCEPTION WHEN duplicate_column THEN NULL;
                END $$;
            """))

        # ========== MULTI-TENANT MIGRATION ==========
        # Add user_id to all tables
        multi_tenant_migrations = [
            ("instagram_config", "user_id", "UUID REFERENCES users(id) ON DELETE CASCADE"),
            ("conversations", "user_id", "UUID REFERENCES users(id) ON DELETE CASCADE"),
            ("known_followers", "user_id", "UUID REFERENCES users(id) ON DELETE CASCADE"),
            ("known_media_likes", "user_id", "UUID REFERENCES users(id) ON DELETE CASCADE"),
            ("activity_log", "user_id", "UUID REFERENCES users(id)"),
        ]
        for table, col, col_def in multi_tenant_migrations:
            conn.execute(text(f"""
                DO $$ BEGIN
                    ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_def};
                EXCEPTION WHEN duplicate_column THEN NULL;
                END $$;
            """))

        # Add unique constraint on instagram_config(user_id) if not exists
        conn.execute(text("""
            DO $$ BEGIN
                ALTER TABLE instagram_config ADD CONSTRAINT uq_config_user UNIQUE (user_id);
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """))

        # Drop old unique constraint on known_followers(instagram_user_id) and add (user_id, instagram_user_id)
        conn.execute(text("""
            DO $$ BEGIN
                ALTER TABLE known_followers DROP CONSTRAINT IF EXISTS known_followers_instagram_user_id_key;
            EXCEPTION WHEN undefined_object THEN NULL;
            END $$;
        """))
        conn.execute(text("""
            DO $$ BEGIN
                CREATE UNIQUE INDEX IF NOT EXISTS uq_known_followers_user
                ON known_followers (user_id, instagram_user_id);
            EXCEPTION WHEN duplicate_table THEN NULL;
            END $$;
        """))

        # Unique index on known_media_likes per user
        conn.execute(text("""
            DO $$ BEGIN
                CREATE UNIQUE INDEX IF NOT EXISTS uq_known_media_likes_user
                ON known_media_likes (user_id, media_id, instagram_user_id);
            EXCEPTION WHEN duplicate_table THEN NULL;
            END $$;
        """))

        # ========== MIGRATE EXISTING DATA ==========
        # If there's existing config data without user_id, create an admin user and assign
        result = conn.execute(text(
            "SELECT COUNT(*) FROM instagram_config WHERE user_id IS NULL AND ig_username != ''"
        ))
        orphan_count = result.scalar()

        if orphan_count > 0:
            # Check if admin already exists
            admin_result = conn.execute(text(
                "SELECT id FROM users WHERE is_admin = true LIMIT 1"
            ))
            admin_row = admin_result.first()

            if admin_row:
                admin_id = str(admin_row[0])
            else:
                # Create admin user with default credentials
                import bcrypt
                default_hash = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
                insert_result = conn.execute(
                    text(
                        "INSERT INTO users (email, password_hash, name, is_admin) "
                        "VALUES ('admin@agenteinsta.com', :pw, 'Admin', true) "
                        "ON CONFLICT (email) DO UPDATE SET is_admin = true "
                        "RETURNING id"
                    ),
                    {"pw": default_hash},
                )
                admin_id = str(insert_result.first()[0])
                logger.info("Created admin user: admin@agenteinsta.com (change password!)")

            # Migrate LLM config to global_config from existing instagram_config
            conn.execute(text("""
                UPDATE global_config SET
                    llm_provider = COALESCE((SELECT llm_provider FROM instagram_config WHERE user_id IS NULL LIMIT 1), llm_provider),
                    llm_api_key = COALESCE((SELECT llm_api_key FROM instagram_config WHERE user_id IS NULL LIMIT 1), llm_api_key),
                    llm_model = COALESCE((SELECT llm_model FROM instagram_config WHERE user_id IS NULL LIMIT 1), llm_model),
                    updated_at = NOW()
                WHERE id = (SELECT id FROM global_config ORDER BY id LIMIT 1)
            """))

            # Assign all orphan data to admin
            for table in ["instagram_config", "conversations", "known_followers", "known_media_likes", "activity_log"]:
                conn.execute(text(f"UPDATE {table} SET user_id = :uid WHERE user_id IS NULL"), {"uid": admin_id})

            logger.info(f"Migrated existing data to admin user {admin_id}")

        conn.commit()
