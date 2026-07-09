-- Migration 005 - Trena
-- À exécuter dans le SQL Editor Supabase (une seule fois).
-- Ajout : distance de course sur l'objectif, pour dériver les allures
-- d'entraînement personnalisées (temps cible + distance → allures par zone).
-- NULL = distance déduite du titre de l'objectif (marathon, semi, 10 km...).

ALTER TABLE objectives
    ADD COLUMN IF NOT EXISTS distance_m INT CHECK (distance_m > 0);
