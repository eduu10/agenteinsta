-- Run this SQL in Supabase SQL Editor to create the required tables
-- Go to: https://supabase.com/dashboard > Your Project > SQL Editor

-- 1. Create application tables

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
);

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
);

CREATE TABLE IF NOT EXISTS known_followers (
    id SERIAL PRIMARY KEY,
    instagram_user_id TEXT UNIQUE NOT NULL,
    instagram_username TEXT DEFAULT '',
    first_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS known_media_likes (
    id SERIAL PRIMARY KEY,
    media_id TEXT NOT NULL,
    instagram_user_id TEXT NOT NULL,
    instagram_username TEXT DEFAULT '',
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(media_id, instagram_user_id)
);

CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    level TEXT DEFAULT 'info',
    message TEXT NOT NULL,
    details TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert default config
INSERT INTO instagram_config (api_mode, llm_provider, llm_model)
VALUES ('instagrapi', 'groq', 'llama-3.3-70b-versatile')
ON CONFLICT DO NOTHING;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_known_followers_user ON known_followers(instagram_user_id);
CREATE INDEX IF NOT EXISTS idx_known_media_likes_media ON known_media_likes(media_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
