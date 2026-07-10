-- Migration 008 - Trena
-- À exécuter dans le SQL Editor Supabase (une seule fois).
-- Sommeil détaillé : stades (profond / léger / paradoxal / éveil) en minutes,
-- en complément de la durée totale (sleep_minutes).

ALTER TABLE daily_metrics
    ADD COLUMN IF NOT EXISTS sleep_deep_minutes INT,
    ADD COLUMN IF NOT EXISTS sleep_light_minutes INT,
    ADD COLUMN IF NOT EXISTS sleep_rem_minutes INT,
    ADD COLUMN IF NOT EXISTS sleep_awake_minutes INT;
