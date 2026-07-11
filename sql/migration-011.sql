-- migration-011 : plan versionné + fenêtre glissante Garmin.
--
-- Différenciateur (spec Notion §4) : le plan complet vit en base et reste
-- visible ; seuls les 7-14 prochains jours sont matérialisés sur la montre.
-- `session_garmin_link` est le mapping idempotent — sans lui, le calendrier
-- Garmin devient une décharge en 3 semaines.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Journal des révisions du plan (se lit comme un changeset).
CREATE TABLE IF NOT EXISTS plan_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    revision INT NOT NULL,
    trigger VARCHAR(60) NOT NULL,        -- WEEKLY / HRV_LOW / ACWR_CAP / USER_STATE ...
    rationale TEXT,                       -- explication (placeholder déterministe, puis LLM)
    metrics_snapshot JSONB,               -- ACWR/TSB/HRV au moment de la décision
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, revision)
);

-- Mapping idempotent séance -> matérialisation Garmin (1 séance = 1 workout).
CREATE TABLE IF NOT EXISTS session_garmin_link (
    session_id UUID PRIMARY KEY REFERENCES training_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    garmin_workout_id BIGINT NOT NULL,
    garmin_scheduled_id BIGINT,
    plan_revision INT NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plan_revisions_user ON plan_revisions(user_id, revision DESC);
CREATE INDEX IF NOT EXISTS idx_session_link_user ON session_garmin_link(user_id);

-- RLS : cohérent avec le reste du schéma.
ALTER TABLE plan_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_garmin_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own plan_revisions" ON plan_revisions
    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own session_links" ON session_garmin_link
    FOR ALL USING (auth.uid() = user_id);
