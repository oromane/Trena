-- ============================================================================
-- Migration 014 — Commentaires de Perlo sur les séances
--
-- Un commentaire par séance, rédigé par le LLM local en tâche de fond après
-- chaque synchro Garmin (et au run de 6h30). L'analyse chiffrée, elle, est
-- calculée à la volée et n'est pas stockée.
--
-- Idempotente. À exécuter dans l'éditeur SQL Supabase.
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_insights (
    session_id UUID PRIMARY KEY REFERENCES training_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    model VARCHAR(120) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_insights_user
    ON activity_insights (user_id);

-- Accès uniquement via le moteur (service_role) : RLS active, aucune policy.
ALTER TABLE activity_insights ENABLE ROW LEVEL SECURITY;
