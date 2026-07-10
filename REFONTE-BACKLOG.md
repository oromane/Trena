# Trena — Backlog de refonte (priorisé)

> Issu de l'audit d'architecture / données / UX. Tickets classés P0 → P3.
> Effort : **S** < 1 j · **M** 1–3 j · **L** 3–7 j · **XL** > 1 semaine.
> Chaque ticket : problème (justifié) → solution → critères d'acceptation → effort → dépendances.

---

## P0 — Fiabilité & correctness (bloquant pour la confiance)

### P0-1 · Supprimer les échecs silencieux + observabilité — **M**
**Problème.** Dans `/garmin/sync`, le bien-être et les activités sont en `try/except` fourre-tout qui avalent l'erreur (`wellness=None`). C'est ainsi que `sync_wellness` (fonction absente → `AttributeError`) a échoué **des semaines sans le moindre signal**. `raise_for_status()` jette sans le corps de la réponse → on a dû reverse-engineer `PGRST102` à la main.
**Solution.**
- Retirer les `except Exception: pass` ; ne rattraper que des exceptions typées et **toujours** logguer (message + corps de réponse PostgREST).
- Enrichir `repo._post/_get/_patch` pour inclure `response.text` dans l'exception levée.
- Brancher une observabilité (Sentry côté moteur + frontend, ou au minimum logs structurés JSON).
- Journaliser un enregistrement `sync_runs` (statut, items, erreurs) par synchro.
**Critères d'acceptation.**
- Une synchro qui échoue partiellement remonte un statut visible (pas de « None » muet).
- Toute erreur PostgREST loggue le code + le message (`PGRST…`) + la table.
- Un dashboard/log permet de voir la dernière synchro et son résultat.
**Dépendances.** Aucune. **À faire en premier** (débloque le diagnostic de tout le reste).

### P0-2 · Unifier le plan d'accès aux données — **L**
**Problème.** Double source de vérité : le frontend lit Supabase en direct (JWT+RLS) pour objectifs/profil, le moteur lit en `service_role` pour le dashboard. Deux clés, deux modèles de confiance → bug « frontend voit 2 objectifs, moteur en voit 0 » (clé `service_role` = `anon`). Reviendra tant que l'accès est dédoublé.
**Solution.** Le **moteur possède toutes les lectures/écritures métier** ; le frontend ne fait que l'authentification Supabase et appelle le moteur. Supprimer les `supabase.from('objectives'/'profiles'…)` côté frontend au profit d'endpoints moteur.
**Critères d'acceptation.**
- Aucune requête `supabase.from(...)` métier dans le frontend (auth exceptée).
- La création/édition d'objectif et la lecture dashboard passent par le même chemin.
- Un test d'intégration vérifie la cohérence objectifs (UI = moteur).
**Dépendances.** P0-1 (observabilité) recommandé avant.

### P0-3 · Synchro Garmin en job de fond — **L**
**Problème.** La synchro est **inline dans la requête HTTP** (jusqu'à 60 j × N appels Garmin + 1 appel de détail par activité) → risque de timeout et de rate-limit, sans retry ni idempotence (hors index unique).
**Solution.** Déporter la synchro dans un worker/queue (n8n déclenche déjà le cron 6 h ; réutiliser ou ajouter une file). Le bouton « Synchroniser » enfile un job ; l'UI suit le statut (`sync_runs`).
**Critères d'acceptation.**
- « Synchroniser » répond immédiatement (job enfilé), l'UI affiche « en cours → terminé/échec ».
- Retry automatique sur erreur transitoire ; idempotent (relançable sans doublon).
- Aucune requête HTTP utilisateur ne dépasse quelques secondes.
**Dépendances.** P0-1.

---

## P1 — Performance & scalabilité

### P1-4 · RPC Postgres unique pour `/dashboard/summary` — **L**
**Problème.** Le `summary` enchaîne **séquentiellement** de nombreux appels PostgREST (objectif, 28 j métriques, 56 j+ séances, profil, calibration…). Latence = somme des allers-retours. Aucun batch/jointure.
**Solution.** Une **fonction SQL** (`rpc: dashboard_summary(user_id, day)`) qui renvoie l'agrégat en **un** aller-retour ; garder le calcul Banister/Foster côté moteur mais lire les données en une passe (ou tout en SQL si réaliste).
**Critères d'acceptation.**
- `/dashboard/summary` fait ≤ 2 allers-retours DB au lieu de ~6.
- Latence P95 du summary divisée par ≥ 2 (mesure avant/après).
- Parité fonctionnelle (mêmes champs qu'aujourd'hui).
**Dépendances.** P0-2 (accès unifié) idéalement.

### P1-5 · Cache summary + Banister incrémental — **M**
**Problème.** `cache: 'no-store'` partout → la simulation Banister 56 j est recalculée à chaque affichage ; `revalidatePath('/dashboard')` re-render complet après chaque micro-action.
**Solution.** Cache court (TTL par utilisateur, invalidé sur mutation) ; état Banister persistant mis à jour **incrémentalement** (dernier point + nouvelle charge) plutôt qu'une resimulation complète ; mutations ciblées/optimistes plutôt que revalidation globale.
**Critères d'acceptation.**
- Un 2ᵉ affichage du dashboard sans changement ne recalcule pas la simulation.
- Marquer une séance « faite » n'entraîne pas un re-fetch complet du summary.
**Dépendances.** P1-4.

### P1-6 · Batch / rate-limit Garmin + cache détail activité — **M**
**Problème.** L'import fait un appel de **détail par activité** (zones FC) → N+1, lent, risque de rate-limit.
**Solution.** Ne récupérer le détail que si absent du résumé, en **batch limité** avec backoff ; mémoriser les activités déjà détaillées (via `garmin_activity_id`) pour ne jamais refaire l'appel.
**Critères d'acceptation.**
- Une resynchro ne re-télécharge pas le détail des activités déjà importées.
- Débit d'appels Garmin plafonné (pas de 429).
**Dépendances.** P0-3.

---

## P2 — Modèle & données

### P2-7 · TRIMP zonal — **M**
**Problème.** Le vecteur de temps par zone FC est **stocké** mais le TRIMP est calculé sur la **FC moyenne** : donnée plus riche que ce que le modèle consomme.
**Solution.** Calculer le TRIMP en zonal (somme pondérée du temps par zone) quand le vecteur est disponible, fallback FC moyenne sinon.
**Critères d'acceptation.**
- Pour une activité avec vecteur de zones, le TRIMP réel dérive du zonal.
- Test unitaire comparant zonal vs FC moyenne sur un cas connu.
**Dépendances.** Import Garmin complet (déjà en place).

### P2-8 · Régénération de plan en diff/merge — **M**
**Problème.** Régénérer = **purge + réinsertion** ; toute personnalisation manuelle est écrasée.
**Solution.** Diff entre plan existant et plan cible : ne toucher que ce qui change, préserver les séances éditées/validées manuellement.
**Critères d'acceptation.**
- Une séance personnalisée survit à une régénération.
- Les séances réalisées ne sont jamais supprimées.
**Dépendances.** —

### P2-9 · Schéma de lignes stable à la source — **S**
**Problème.** Les dicts de synchro ont des clés variables selon les jours → `PGRST102` (rustiné dans le repo).
**Solution.** Construire les lignes avec **toutes** les clés (à `None` par défaut) à la source (`fetch_daily`/`fetch_wellness`), garder la normalisation repo en filet.
**Critères d'acceptation.**
- Toutes les lignes d'un batch ont un jeu de clés identique dès la source.
**Dépendances.** —

---

## P3 — UX

### P3-10 · États vides / erreurs honnêtes — **S**
**Problème.** « Pas assez de données pour Calories » alors que la cause était un bug backend : l'UI accuse l'utilisateur.
**Solution.** Distinguer « pas encore de données » de « synchro en échec » via le statut `sync_runs` (P0-1) ; message + action adaptés.
**Critères d'acceptation.**
- Si la dernière synchro a échoué, l'UI le dit (et propose de réessayer), au lieu de « pas assez de données ».
**Dépendances.** P0-1.

### P3-11 · Densité mobile / divulgation progressive — **M**
**Problème.** Cockpit dense pensé desktop → scroll lourd sur mobile.
**Solution.** Hiérarchie mobile (décision du jour → physio → reste replié), sections repliables, priorisation par contexte.
**Critères d'acceptation.**
- Sur mobile, la décision du jour est visible sans scroll ; les sections secondaires sont repliées par défaut.
**Dépendances.** —

### P3-12 · Passe de contraste extérieur — **S**
**Problème.** Palette teal-sur-teal limite en plein soleil (objectif produit revendiqué).
**Solution.** Auditer les contrastes (WCAG AA) sur fond `#2F4F4F` ; relever `muted`/`gray` si nécessaire ; tester en luminosité élevée.
**Critères d'acceptation.**
- Texte secondaire ≥ AA sur les surfaces principales.
**Dépendances.** —

---

## Ordre d'exécution recommandé

| Sprint | Tickets | Pourquoi |
| --- | --- | --- |
| **1** | P0-1, P2-9, P3-10 | Fiabilité + visibilité immédiate, faible risque. Débloque le diagnostic. |
| **2** | P0-3, P1-6 | Sortir la synchro du chemin requête + fiabiliser Garmin. |
| **3** | P0-2 | Unifier l'accès données (refonte structurante, à faire une fois la synchro stable). |
| **4** | P1-4, P1-5 | Performance : RPC summary + cache/incrémental. |
| **5** | P2-7, P2-8, P3-11, P3-12 | Qualité modèle + finitions UX. |

**Quick wins isolables tout de suite** : P0-1 (observabilité), P2-9 (schéma stable), P3-10 (états honnêtes), P3-12 (contraste).
