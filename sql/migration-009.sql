-- Migration 009 - Trena
-- À exécuter dans le SQL Editor Supabase (une seule fois).
-- Statut des synchronisations (fin des échecs silencieux) : un enregistrement
-- par run, pour l'observabilité et l'affichage « dernière synchro » côté UI.

CREATE TABLE IF NOT EXISTS sync_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL DEFAULT 'garmin',
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'error')),
    daily_days INT,
    wellness_days INT,
    activities_imported INT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_user
    ON sync_runs(user_id, created_at DESC);

ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own sync_runs" ON sync_runs;
CREATE POLICY "own sync_runs" ON sync_runs
    FOR ALL USING (auth.uid() = user_id);
