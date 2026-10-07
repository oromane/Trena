-- ============================================================================
-- Migration 015 — Amis et partage
--
-- Invitation par code ami (pas de recherche par e-mail : aucun annuaire,
-- aucune énumération de comptes). Partage choisi par catégorie, par défaut :
--   - séances et volume : partagés
--   - physiologie (HRV, sommeil) : privée ; si activée, l'ami ne voit que le
--     niveau de forme du jour, jamais les valeurs brutes.
-- Tout l'accès passe par le moteur (service_role) qui vérifie l'amitié
-- acceptée ET les préférences de l'ami à chaque lecture.
--
-- Idempotente. À exécuter dans l'éditeur SQL Supabase.
-- ============================================================================

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS friend_code VARCHAR(12) UNIQUE,
    ADD COLUMN IF NOT EXISTS share_activities BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS share_physio BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,
    CHECK (requester_id <> addressee_id)
);

-- Une seule relation par paire, quel que soit le sens de la demande.
CREATE UNIQUE INDEX IF NOT EXISTS uq_friendships_pair ON friendships (
    LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee_id);

-- Accès uniquement via le moteur (service_role) : RLS active, aucune policy.
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
