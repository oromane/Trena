-- Migration 002 - Trena
-- À exécuter dans le SQL Editor Supabase (une seule fois).
-- Ajouts : nom d'affichage, nombre de séances/semaine, heure de séance.

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS sessions_per_week INT
        CHECK (sessions_per_week BETWEEN 1 AND 7);

ALTER TABLE training_sessions
    ADD COLUMN IF NOT EXISTS scheduled_time TIME;
