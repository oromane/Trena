-- Adaptive Training System - Schéma PostgreSQL (Supabase)
-- À exécuter dans le SQL Editor Supabase ou via migration.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profil applicatif, extension de auth.users (Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    weekly_availability_mask INT[] NOT NULL DEFAULT '{60,60,60,60,60,120,120}'
        CHECK (array_length(weekly_availability_mask, 1) = 7)
);

-- Jetons OAuth2 (Google Calendar) — chiffrés applicativement avant insertion
CREATE TABLE oauth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

-- Objectifs sportifs
CREATE TABLE objectives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_date DATE NOT NULL,
    target_time_seconds INT,
    sport_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Métriques physiologiques quotidiennes
CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recorded_date DATE NOT NULL,
    hrv_ms REAL,
    sleep_minutes INT,
    resting_heart_rate INT,
    stress_score INT,
    UNIQUE(user_id, recorded_date)
);

-- Séances d'entraînement (prévues et réalisées)
CREATE TABLE training_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    session_type VARCHAR(50) NOT NULL
        CHECK (session_type IN ('INTERVAL','TEMPO','ENDURANCE','RECOVERY')),
    duration_planned_minutes INT NOT NULL,
    intensity_target_trimp INT NOT NULL,
    status VARCHAR(20) DEFAULT 'PLANNED'
        CHECK (status IN ('PLANNED','COMPLETED','MISSED','MODIFIED')),
    duration_actual_minutes INT,
    trimp_actual INT,
    calendar_event_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index de performance pour les requêtes du moteur
CREATE INDEX idx_daily_metrics_user_date ON daily_metrics(user_id, recorded_date DESC);
CREATE INDEX idx_training_sessions_user_date ON training_sessions(user_id, scheduled_date);
CREATE INDEX idx_objectives_user_active ON objectives(user_id) WHERE is_active;

-- Row Level Security (Supabase)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile" ON profiles
    FOR ALL USING (auth.uid() = id);
CREATE POLICY "own objectives" ON objectives
    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own metrics" ON daily_metrics
    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own sessions" ON training_sessions
    FOR ALL USING (auth.uid() = user_id);
-- oauth_tokens : aucun accès client — uniquement service_role (backend)
