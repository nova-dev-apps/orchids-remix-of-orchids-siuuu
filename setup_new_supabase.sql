-- SUPABASE SCHEMA SETUP
-- Copy and run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/fbcnlgplfkooqyvqhuxn/sql)

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    payment_status TEXT DEFAULT 'pending',
    subscription_id TEXT,
    is_admin BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_subscribed BOOLEAN DEFAULT false,
    last_session_id TEXT,
    subscription_started_at TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,
    subscription_expires_at TIMESTAMPTZ,
    auth_provider TEXT DEFAULT 'email',
    google_id TEXT
);

-- Create google_tokens table for storing Google OAuth tokens for automation
CREATE TABLE IF NOT EXISTS public.google_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT UNIQUE NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ai_behavior_settings table
CREATE TABLE IF NOT EXISTS public.ai_behavior_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_name TEXT,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ai_config table
CREATE TABLE IF NOT EXISTS public.ai_config (
    id TEXT PRIMARY KEY,
    api_key TEXT,
    endpoint_url TEXT,
    model TEXT,
    custom_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create global_token_limits table
CREATE TABLE IF NOT EXISTS public.global_token_limits (
    id TEXT PRIMARY KEY,
    daily_limit INTEGER DEFAULT 50000,
    monthly_limit INTEGER DEFAULT 1000000,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create paypal_config table
CREATE TABLE IF NOT EXISTS public.paypal_config (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    client_secret TEXT,
    plan_id TEXT,
    sandbox_mode BOOLEAN DEFAULT true,
    subscription_price TEXT,
    subscription_currency TEXT DEFAULT 'USD',
    paypal_link TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_token_balances table
CREATE TABLE IF NOT EXISTS public.user_token_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT UNIQUE NOT NULL,
    daily_tokens_remaining INTEGER,
    monthly_tokens_remaining INTEGER,
    daily_limit INTEGER,
    monthly_limit INTEGER,
    last_daily_reset TIMESTAMPTZ DEFAULT now(),
    last_monthly_reset TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    preview TEXT,
    messages JSONB DEFAULT '[]'::jsonb,
    active_tab TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);

-- Create user_session_index table (for last session tracking)
CREATE TABLE IF NOT EXISTS public.user_session_index (
    user_id TEXT PRIMARY KEY,
    last_session_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create execution_screenshots table
CREATE TABLE IF NOT EXISTS public.execution_screenshots (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    session_id TEXT,
    screenshot_data TEXT,
    task_description TEXT,
    execution_state TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for user_email lookups
CREATE INDEX IF NOT EXISTS idx_execution_screenshots_user_email ON public.execution_screenshots(user_email);

-- Create execution_history table
CREATE TABLE IF NOT EXISTS public.execution_history (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    plan_id TEXT,
    plan_title TEXT,
    status TEXT,
    tasks_completed INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,
    error TEXT,
    executed_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for user_email lookups
CREATE INDEX IF NOT EXISTS idx_execution_history_user_email ON public.execution_history(user_email);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE user_token_balances;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_behavior_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
