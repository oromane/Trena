-- Migration 007 - Trena
-- À exécuter dans le SQL Editor Supabase (une seule fois).
-- Import Garmin complet (type Strava) : toutes les métriques riches d'une
-- activité (allures, dénivelé, cadence, foulée, zones FC, Training Effect,
-- température, VO2max...) sont stockées dans un blob JSONB unique et flexible,
-- en complément des colonnes existantes (distance_m, avg_hr).

ALTER TABLE training_sessions
    ADD COLUMN IF NOT EXISTS activity_metrics JSONB;
