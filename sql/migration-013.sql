-- ============================================================================
-- Migration 013 — Analyse du jour du conseiller (Perlo)
--
-- Le modèle local est trop lent sur CPU pour répondre en direct (1 à 2 min).
-- L'analyse du jour est donc générée à 6h par n8n (POST /advisor/daily/run)
-- et stockée ici : le dashboard et le conseiller l'affichent instantanément.
--
-- Idempotente. À exécuter dans l'éditeur SQL Supabase.
-- ============================================================================

CREATE TABLE IF NOT EXISTS advisor_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    text TEXT NOT NULL,
    model VARCHAR(120) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_advisor_daily_user_day
    ON advisor_daily (user_id, day DESC);

-- Accès uniquement via le moteur (service_role) : RLS active, aucune policy.
ALTER TABLE advisor_daily ENABLE ROW LEVEL SECURITY;
