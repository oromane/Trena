-- Migration : Créer tables pour le module Strength
-- Exécuter dans Supabase SQL Editor

BEGIN TRANSACTION;

-- Table des exercices
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    muscle_primary VARCHAR(100) NOT NULL,
    muscle_secondary VARCHAR(255),
    equipment VARCHAR(100) NOT NULL DEFAULT 'bodyweight',
    instructions TEXT,
    difficulty VARCHAR(50) DEFAULT 'intermediate',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_exercises_muscle_primary ON exercises(muscle_primary);
CREATE INDEX idx_exercises_equipment ON exercises(equipment);

-- Table : Prescriptions d'exercice
CREATE TABLE IF NOT EXISTS strength_prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    target_reps INT NOT NULL,
    target_sets INT NOT NULL,
    target_rir INT NOT NULL DEFAULT 2,
    load_kg NUMERIC(8,2) NOT NULL DEFAULT 0,
    order_in_session INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, order_in_session)
);

CREATE INDEX idx_strength_prescriptions_session ON strength_prescriptions(session_id);

-- Table : Enregistrement des sets
CREATE TABLE IF NOT EXISTS strength_set_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES strength_prescriptions(id) ON DELETE CASCADE,
    set_number INT NOT NULL,
    reps_completed INT NOT NULL,
    rir_actual INT NOT NULL,
    load_kg NUMERIC(8,2) NOT NULL,
    tonnage_kg NUMERIC(12,2) GENERATED ALWAYS AS (reps_completed * load_kg) STORED,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(prescription_id, set_number)
);

-- Table : Progression des exercices
CREATE TABLE IF NOT EXISTS strength_progression (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    load_kg NUMERIC(8,2) NOT NULL,
    reps INT NOT NULL,
    rir INT NOT NULL,
    tonnage_kg NUMERIC(12,2) NOT NULL,
    progression_type VARCHAR(50) NOT NULL,
    session_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exercise_id, session_date)
);

CREATE INDEX idx_strength_progression_user_exercise ON strength_progression(user_id, exercise_id);

-- RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_progression ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Read exercises" ON exercises FOR SELECT USING (true);

CREATE POLICY "Users read own prescriptions" ON strength_prescriptions
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM training_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users read own progression" ON strength_progression
    FOR SELECT USING (user_id = auth.uid());

COMMIT;

-- Vérification
SELECT COUNT(*) as exercises_count FROM exercises;
