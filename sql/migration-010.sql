-- Migration 010 - Trena
-- À exécuter dans le SQL Editor Supabase (une seule fois).
-- Synchro non-bloquante : autorise le statut 'running' (job de fond en cours).

ALTER TABLE sync_runs DROP CONSTRAINT IF EXISTS sync_runs_status_check;
ALTER TABLE sync_runs ADD CONSTRAINT sync_runs_status_check
    CHECK (status IN ('running', 'success', 'partial', 'error'));
