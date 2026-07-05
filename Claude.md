# Adaptive Training System - Spécification Produit & Architecture Technique

## 1. Vision Produit & Objectifs

L'Adaptive Training System est un écosystème logiciel conçu pour générer, ajuster et synchroniser automatiquement un plan d'entraînement sportif individualisé en temps réel. Contrairement aux approches statiques basées sur des calendriers rigides (Garmin, Strava, fichiers Excel), ce système évalue quotidiennement l'état physiologique de l'utilisateur pour maximiser la probabilité de réussite d'un objectif d'endurance donné (course sur route, trail, triathlon, trek) tout en minimisant le risque de blessure et de surentraînement.

---

## 2. Analyse des Limites Actuelles

Le marché actuel souffre de quatre faiblesses structurelles majeures que ce système vise à corriger :

### 2.1 Plans figés et déconnexion théorique
Les plans d'entraînement traditionnels supposent une progression linéaire idéale. Ils sont incapables d'intégrer des imprévus tels qu'une mauvaise nuit de sommeil, une charge de travail professionnelle accrue ou un début de pathologie musculo-squelettique. Le système remplace cette planification rigide par une logique adaptative quotidienne.

### 2.2 Données physiologiques sous-exploitées
Les capteurs modernes (Garmin, Apple Watch, Oura) collectent des données de haute qualité (HRV, latence cardiaque, phases de sommeil, charge cardiovasculaire). Cependant, ces plateformes se limitent à un rôle de tableau de bord passif (ex : affichage du score de "Body Battery"). Elles ne traduisent pas ces métriques en décisions concrètes de modification de charge de travail pour les jours à venir.

### 2.3 Absence de boucle d'apprentissage individualisée
Chaque athlète possède une dynamique de récupération propre. Les algorithmes grand public appliquent des coefficients génériques. Ce système modélise la réponse à l'effort de chaque utilisateur pour quantifier son temps de récupération réel par type de séance (seuil, endurance fondamentale, capacité anaérobie).

### 2.4 Gestion passive des calendriers
Les outils de gestion du temps (Google Calendar, Outlook) ne servent que d'affichage. Le système intègre le calendrier personnel comme une contrainte active, empêchant la planification d'une charge lourde sur des fenêtres temporelles indisponibles ou déjà surchargées par des engagements tiers.

---

## 3. Architecture Système Globale

Le système repose sur un découpage en microservices spécialisés pour isoler la logique métier, le traitement de données intensif et l'interface utilisateur.

```
+-----------------------------------------------------------+
|                      INTERFACE WEB                         |
|                     (Next.js / React)                      |
+-----------------------------------------------------------+
                            │
                            ▼
+-----------------------------------------------------------+
|                     BASE DE DONNÉES                        |
|                       (Supabase)                           |
+-----------------------------------------------------------+
                            ▲
                            │
                            ▼
+-----------------------------------------------------------+
|                    MOTEUR DE DÉCISION                      |
|                     (Python FastAPI)                       |
+-----------------------------------------------------------+
                            ▲
                            │
                            ▼
+-----------------------------------------------------------+
|                ORCHESTRATION & SYNC EXTERNE                |
|               (n8n / Google Calendar API)                  |
+-----------------------------------------------------------+
```

### 3.1 Interface Utilisateur (Frontend)
* **Technologie :** Next.js, React, Tailwind CSS.
* **Fonctionnalité :** Visualisation du tableau de bord de performance, configuration des objectifs et des contraintes hebdomadaires, simulation d'impact de séances et interface de retour d'expérience (feedback).
* **Communication backend :** le frontend joint le moteur de décision via l'URL interne du réseau Docker (`http://performance-engine:8000`), exposée côté serveur Next.js uniquement (variable `PERFORMANCE_ENGINE_URL`). Aucune exposition publique du moteur.

### 3.2 Base de Données et Authentification
* **Technologie :** Supabase (PostgreSQL).
* **Fonctionnalité :** Gestion de la persistance des profils, stockage des historiques d'entraînement, gestion sécurisée des sessions et persistance des jetons d'accès (OAuth2 tokens) pour les synchronisations externes.
* **Contrainte d'intégrité :** le profil applicatif (`profiles`) référence directement `auth.users` de Supabase (clé étrangère sur `auth.users.id`) — aucune table utilisateur parallèle, pas de risque de désynchronisation avec le système d'authentification.

### 3.3 Moteur de Calcul (Backend)
* **Technologie :** Python avec FastAPI, NumPy et SciPy.
* **Fonctionnalité :** Traitement mathématique des modèles de fatigue, analyse des séries temporelles physiologiques et exécution de l'algorithme d'optimisation de la charge hebdomadaire.

---

## 4. Stratégie d'Ingestion des Données Physiologiques

La spécification initiale reposait sur un accès direct à l'API Garmin Health. Cette approche est irréaliste pour une structure indépendante ou en phase de démarrage en raison des restrictions d'accès strictes d'ordre commercial (B2B) appliquées par Garmin.

### 4.1 Solution de contournement technique
L'ingestion de données physiologiques (HRV, sommeil, fréquence cardiaque au repos) est déportée vers les agrégateurs système natifs des smartphones des utilisateurs (Apple HealthKit pour iOS, Google Health Connect pour Android).
Une application mobile légère (ou un module PWA avancé) sert de passerelle. Garmin, Polar ou Whoop synchronisent nativement leurs métriques vers Apple Health ou Health Connect. L'application extrait périodiquement ces données locales et les pousse par requêtes HTTP POST sécurisées vers le backend Supabase.

### 4.2 Pipeline de traitement des données
1. **Ingestion :** Collecte des données brutes via l'API du service mobile.
2. **Normalisation :** Conversion des unités et gestion des données manquantes (imputation par moyenne mobile centrée sur 7 jours en cas d'absence temporaire de données de sommeil).
3. **Feature Store :** Stockage des variables nettoyées prêtes pour le moteur d'optimisation.

---

## 5. Moteur Mathématique de Décision (Core Engine)

Pour éviter les biais de modèles de Machine Learning sous-entraînés en phase d'amorçage, le système implémente une approche déterministe basée sur le modèle de Fitness-Fatigue de Banister.

### 5.1 Modélisation de la Performance
La performance estimée p(t) d'un athlète au jour t est la résultante de son niveau de condition physique (aptitude) et de son état de fatigue accumulé :

```
p(t) = p0 + k1 * ∫₀ᵗ w(s) · e^(-(t-s)/tau1) ds - k2 * ∫₀ᵗ w(s) · e^(-(t-s)/tau2) ds
```

* **p0 :** Niveau initial de performance de l'athlète.
* **w(s) :** Charge de la séance d'entraînement au jour s, quantifiée par le score TRIMP (Training Impulse) basé sur les zones de fréquence cardiaque.
* **tau1 :** Constante de temps de décroissance de l'aptitude physique (généralement comprise entre 40 et 50 jours).
* **tau2 :** Constante de temps de décroissance de la fatigue (généralement comprise entre 7 et 11 jours).
* **k1, k2 :** Coefficients de pondération de l'aptitude et de la fatigue.

### 5.2 Algorithme d'Ajustement Dynamique Quotidien
Chaque matin, le système calcule l'écart entre la valeur théorique de HRV de l'utilisateur (ligne de base établie sur 28 jours) et la valeur mesurée au réveil.

* **Si HRV est dans la norme (écart inférieur à 1 écart type) :** Le planning théorique est maintenu. La séance générée correspond aux exigences du bloc d'entraînement en cours.
* **Si HRV subit une baisse significative (supérieure à 1.5 écart type) cumulée à un déficit de sommeil :** Le système modifie instantanément la valeur locale du paramètre tau2 (allongement du temps de récupération nécessaire). L'algorithme d'optimisation recalcule la séance du jour pour réduire la contrainte systémique, remplaçant par exemple une séance de fractionné par une séance d'endurance fondamentale de basse intensité.

---

## 6. Modélisation de la Base de Données (Schéma PostgreSQL)

Structure relationnelle requise pour soutenir les calculs du moteur et la synchronisation des calendriers. Le schéma s'appuie sur Supabase Auth : `profiles` étend `auth.users` (pas de table utilisateur parallèle).

```sql
-- Extension pour la génération des UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profil applicatif, extension de auth.users (Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    weekly_availability_mask INT[] NOT NULL -- 7 entiers : minutes disponibles par jour
);

-- Jetons OAuth2 pour les synchronisations externes (Google Calendar)
CREATE TABLE oauth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google_calendar'
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scopes TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

-- Table des objectifs sportifs
CREATE TABLE objectives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_date DATE NOT NULL,
    target_time_seconds INT,
    sport_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des métriques physiologiques quotidiennes
CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    recorded_date DATE NOT NULL,
    hrv_ms REAL,
    sleep_minutes INT,
    resting_heart_rate INT,
    stress_score INT,
    UNIQUE(user_id, recorded_date)
);

-- Table des séances d'entraînement (prévues et réalisées)
CREATE TABLE training_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    session_type VARCHAR(50) NOT NULL, -- 'INTERVAL', 'TEMPO', 'ENDURANCE', 'RECOVERY'
    duration_planned_minutes INT NOT NULL,
    intensity_target_trimp INT NOT NULL,
    status VARCHAR(20) DEFAULT 'PLANNED', -- 'PLANNED', 'COMPLETED', 'MISSED', 'MODIFIED'
    duration_actual_minutes INT,
    trimp_actual INT,
    calendar_event_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. Système d'Intégration Calendrier

La synchronisation bidirectionnelle requiert l'abandon complet des fichiers statiques .ics au profit de l'API Google Calendar.

### 7.1 Protocole de Synchronisation API

1. **Authentification :** L'utilisateur lie son compte Google via OAuth2 géré par Supabase Auth. Les jetons d'accès et de rafraîchissement (refresh tokens) sont stockés chiffrés dans la table `oauth_tokens` (cf. §6).
2. **Création des événements :** Lors de la validation d'un bloc d'entraînement, le système effectue des requêtes POST groupées vers l'API Google Calendar pour injecter les séances sous forme de blocs horaires dédiés.
3. **Mise à jour en temps réel :** Si le moteur de décision modifie la séance le matin à 6h00 en raison de métriques de fatigue critiques, le backend émet une requête PATCH ciblée sur l'identifiant de l'événement (`calendar_event_id`) pour mettre à jour le titre, la description de la séance (zones d'intensité, allure ciblée) et la durée, garantissant une cohérence immédiate pour l'utilisateur.

---

## 8. Stratégie de Déploiement et de Mise en Production (DevOps)

La mise en production du système s'articule autour d'une conteneurisation stricte et d'une infrastructure sécurisée sur Serveur Privé Virtuel (VPS).

### 8.1 Configuration Docker Compose (`docker-compose.yml`)

La stack logicielle est isolée au sein d'un réseau virtuel Docker pour éviter toute exposition inutile de ports de calcul sur l'interface publique.

```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - PERFORMANCE_ENGINE_URL=http://performance-engine:8000
    restart: always
    networks:
      - app-network

  performance-engine:
    build:
      context: ./backend-python
      dockerfile: Dockerfile
    environment:
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
    restart: always
    networks:
      - app-network

  n8n:
    image: docker.n8n.io/n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://${N8N_HOST}/
    volumes:
      - n8n_data:/home/node/.n8n
    restart: always
    networks:
      - app-network

volumes:
  n8n_data:

networks:
  app-network:
    driver: bridge
```

Note : le service `performance-engine` n'expose aucun port public. Il n'est joignable que depuis le réseau `app-network` via `http://performance-engine:8000` (appels serveur-à-serveur depuis Next.js et n8n).

### 8.2 Sécurisation et Exposition via Cloudflare Tunnels

Pour éliminer les risques liés à l'ouverture de ports publics (comme les ports 3000, 5678 ou les accès directs aux bases de données) et s'affranchir de la gestion manuelle des certificats SSL sous Nginx, le déploiement utilise un connecteur Cloudflare Tunnel (`cloudflared`).

1. **Mécanisme :** Le démon `cloudflared` est installé sur le VPS. Il établit une connexion sortante cryptée et persistante vers les serveurs Edge de Cloudflare.
2. **Routage externe :** Le trafic à destination de `app.domaine.com` est capté par Cloudflare, nettoyé des attaques DDoS courantes, puis injecté via le tunnel directement vers le port 3000 du conteneur Next.js local. Le service d'orchestration n8n est accessible via `automation.domaine.com`, routé vers le port 5678.
3. **Sécurité réseau :** Le pare-feu du VPS bloque toutes les connexions entrantes sur les ports HTTP/HTTPS génériques. Seul le trafic passant par le tunnel Cloudflare authentifié accède aux services. Les secrets de l'API Python et de Supabase restent strictement confinés au réseau Docker interne.
