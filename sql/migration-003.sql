-- Migration 003 - Trena
-- À exécuter dans le SQL Editor Supabase (une seule fois).
-- Ajouts : paramètres cardiaques du profil, séances structurées,
-- réalisé enrichi, table bien-être Garmin étendue.

-- Profil : nécessaires au calcul du TRIMP réel des activités importées
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS hr_max INT CHECK (hr_max BETWEEN 120 AND 230),
    ADD COLUMN IF NOT EXISTS hr_rest INT CHECK (hr_rest BETWEEN 30 AND 100),
    ADD COLUMN IF NOT EXISTS sex VARCHAR(1) CHECK (sex IN ('M', 'F'));

-- Séances : titre + structure personnalisée (modèles), réalisé enrichi
ALTER TABLE training_sessions
    ADD COLUMN IF NOT EXISTS title VARCHAR(150),
    ADD COLUMN IF NOT EXISTS structure JSONB,
    ADD COLUMN IF NOT EXISTS distance_m INT,
    ADD COLUMN IF NOT EXISTS avg_hr INT,
    ADD COLUMN IF NOT EXISTS garmin_activity_id VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_garmin_activity
    ON training_sessions(user_id, garmin_activity_id)
    WHERE garmin_activity_id IS NOT NULL;

-- Bien-être Garmin étendu (1 ligne / utilisateur / jour)
CREATE TABLE IF NOT EXISTS garmin_wellness (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recorded_date DATE NOT NULL,
    weight_kg REAL,
    steps INT,
    calories_total INT,
    vo2max REAL,
    body_battery_high INT,
    body_battery_low INT,
    floors_climbed INT,
    intensity_minutes INT,
    UNIQUE(user_id, recorded_date)
);

CREATE INDEX IF NOT EXISTS idx_garmin_wellness_user_date
    ON garmin_wellness(user_id, recorded_date DESC);

ALTER TABLE garmin_wellness ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own wellness" ON garmin_wellness;
CREATE POLICY "own wellness" ON garmin_wellness
    FOR ALL USING (auth.uid() = user_id);
