-- Migration 006 - Trena
-- À exécuter dans le SQL Editor Supabase (une seule fois).
-- Bibliothèque de séances de test, ISOLÉE du moteur : cette table n'est
-- jamais balayée par le calcul des projections Banister. Elle stocke des
-- modèles construits manuellement (structure JSONB), réutilisables et
-- éventuellement poussés vers Garmin, sans impacter la charge prévisionnelle.

CREATE TABLE IF NOT EXISTS templates_seances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    session_type VARCHAR(50) NOT NULL
        CHECK (session_type IN ('INTERVAL','TEMPO','ENDURANCE','RECOVERY')),
    duration_minutes INT NOT NULL,
    target_trimp INT NOT NULL,
    structure JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_templates_seances_user
    ON templates_seances(user_id, created_at DESC);

ALTER TABLE templates_seances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own templates" ON templates_seances;
CREATE POLICY "own templates" ON templates_seances
    FOR ALL USING (auth.uid() = user_id);
