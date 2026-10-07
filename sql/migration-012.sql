-- ============================================================================
-- Migration 012 — Ouvrir le module Kiné / rééducation
--
-- CONTEXTE
-- Le module Kiné ne peut pas fonctionner en l'état : `training_sessions.
-- discipline` est un ENUM Postgres dont les seules valeurs sont RUN, STRENGTH,
-- BIKE, SWIM et TRIATHLON (relevé par sondage le 03/08/2026). Toute tentative
-- d'insertion avec une autre valeur échoue en 22P02.
--
-- ⚠️  À NE PAS EXÉCUTER TEL QUEL.
-- L'étape 2 réécrit la contrainte CHECK qui restreint `session_type` selon la
-- discipline. Cette contrainte existe déjà et son contenu exact n'a pas pu
-- être lu depuis l'API REST. La réécrire à l'aveugle risquerait de casser les
-- disciplines existantes.
--
-- MARCHE À SUIVRE
-- 1. Exécuter d'abord la requête de diagnostic ci-dessous dans l'éditeur SQL
--    Supabase, et transmettre son résultat.
-- 2. L'étape 2 sera alors réécrite à l'identique, augmentée de REHAB.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- ÉTAPE 0 — Diagnostic (à exécuter en premier, ne modifie rien)
-- ---------------------------------------------------------------------------
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM   pg_constraint
WHERE  conrelid = 'training_sessions'::regclass
AND    contype  = 'c';

-- Valeurs actuelles de l'ENUM, pour mémoire :
SELECT enumlabel
FROM   pg_enum
WHERE  enumtypid = 'discipline'::regtype
ORDER  BY enumsortorder;


-- ---------------------------------------------------------------------------
-- ÉTAPE 1 — Ajouter la valeur REHAB à l'ENUM (sans risque, idempotent)
--
-- ALTER TYPE ... ADD VALUE ne peut pas s'exécuter dans un bloc transactionnel
-- avec d'autres instructions sur ce même type : lancer cette ligne seule.
-- ---------------------------------------------------------------------------
ALTER TYPE discipline ADD VALUE IF NOT EXISTS 'REHAB';


-- ---------------------------------------------------------------------------
-- ÉTAPE 2 — Autoriser les types de séance de rééducation
--
-- À COMPLÉTER une fois le résultat de l'étape 0 connu. Le squelette attendu :
--
--   ALTER TABLE training_sessions
--     DROP CONSTRAINT <nom_relevé_à_l_étape_0>;
--
--   ALTER TABLE training_sessions
--     ADD CONSTRAINT <nom_relevé_à_l_étape_0> CHECK (
--       <définition_existante_recopiée_à_l_identique>
--       OR (discipline = 'REHAB'
--           AND session_type IN ('MOBILITY', 'STRENGTH', 'STRETCH'))
--     );
--
-- Ne pas inventer la définition existante : la recopier depuis l'étape 0.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- ÉTAPE 3 — Champs propres au suivi de rééducation
--
-- Le niveau de douleur et la zone traitée n'ont pas d'équivalent dans le
-- schéma actuel. La colonne activity_metrics (JSONB, migration 007) pourrait
-- les accueillir sans nouvelle colonne, mais des colonnes dédiées se filtrent
-- et s'indexent mieux pour un suivi longitudinal.
-- ---------------------------------------------------------------------------
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS body_area   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS pain_level  SMALLINT
    CHECK (pain_level IS NULL OR pain_level BETWEEN 0 AND 10);

COMMENT ON COLUMN training_sessions.body_area IS
  'Zone traitée en rééducation (genou, épaule, dos…). NULL hors discipline REHAB.';
COMMENT ON COLUMN training_sessions.pain_level IS
  'Douleur ressentie de 0 à 10. Suivi subjectif, ne remplace pas un avis médical.';
