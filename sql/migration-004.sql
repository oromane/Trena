-- Migration 004 : paramètres de Banister calibrés individuellement.
-- NULL = utiliser les valeurs par défaut du moteur (config.py).

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS banister_tau1 REAL CHECK (banister_tau1 > 0),
    ADD COLUMN IF NOT EXISTS banister_tau2 REAL CHECK (banister_tau2 > 0),
    ADD COLUMN IF NOT EXISTS banister_k1 REAL CHECK (banister_k1 >= 0),
    ADD COLUMN IF NOT EXISTS banister_k2 REAL CHECK (banister_k2 >= 0),
    ADD COLUMN IF NOT EXISTS banister_p0 REAL,
    ADD COLUMN IF NOT EXISTS banister_r2 REAL,
    ADD COLUMN IF NOT EXISTS banister_calibrated_at TIMESTAMP WITH TIME ZONE;
