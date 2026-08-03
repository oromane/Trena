# Checklist Lancement — Finition Trena

**Objectif :** Débloquer Module Strength + Configuration Production  
**Timeline :** Semaine 1 (5 jours)  
**Effort :** 16h à temps plein

---

## ✅ JOUR 1 — Migrations DB + Import Exercices (8h)

### Matin (4h)

- [ ] **1.1** Ouvrir Supabase SQL Editor
  ```
  https://app.supabase.com/project/[YOUR_PROJECT]/sql/new
  ```

- [ ] **1.2** Copier contenu `C:\Projets\Trena\sql\migration-strength.sql`
  - Coller dans SQL Editor
  - Exécuter
  - **Résultat :** Zéro erreur

- [ ] **1.3** Vérifier création
  ```sql
  SELECT count(*) FROM exercises;
  -- Résultat : 0 (table vide, normal)
  ```

### Après-midi (4h)

- [ ] **1.4** Préparer environnement Python
  ```bash
  cd C:\Projets\Trena
  
  # Créer venv si absent
  python -m venv venv
  .\venv\Scripts\Activate
  
  # Installer dépendances
  pip install python-dotenv supabase httpx
  pip install -r backend-python\requirements.txt
  ```

- [ ] **1.5** Lancer import
  ```bash
  cd C:\Projets\Trena
  python scripts/import_exercises.py
  
  # Résultat attendu :
  # ✓ 850 exercices importés
  ```

- [ ] **1.6** Vérifier dans Supabase
  ```sql
  SELECT count(*) FROM exercises;
  -- Résultat : 850
  ```

**Checkpoint Jour 1 :** `✅ 850 exercices en base`

---

## ✅ JOUR 2-3 — Configuration & Tests (8h)

- [ ] **2.1** Tests Backend
  ```bash
  cd backend-python
  pip install -r requirements-dev.txt
  pytest tests/ -v
  # ✓ 219 passed
  ```

- [ ] **2.2** Vérifier Docker
  ```bash
  docker compose up -d --build
  curl http://localhost:8000/health
  # ✓ 200 OK
  ```

- [ ] **2.3** Tester endpoint exercices
  ```bash
  curl "http://localhost:8000/exercises?muscle=chest&limit=5"
  # ✓ Retourne 5 exercices
  ```

**Checkpoint Jour 3 :** `✅ API fonctionne localement`

---

## ✅ JOUR 4-5 — GitHub & Prod Prep (4h)

- [ ] **3.1** Git commit
  ```bash
  cd C:\Projets\Trena
  git add -A
  git commit -m "feat: Complete Strength module with exercises import"
  git push origin main
  ```

- [ ] **3.2** Vérifier GitHub Actions
  ```
  Allez sur github.com/[votre-repo]/actions
  Résultat : Tests run automatiquement et passent
  ```

**Checkpoint Fin Semaine 1 :** `✅ TOUS LES BLOCAGES DÉBLOQUES`

---

## 📋 Prochaines Étapes (Semaines 2-4)

Après cette semaine 1 :
1. **Sem 2-3** : Frontend Strength (écran séance)
2. **Sem 4** : Docs + Déploiement VPS

---

## 🆘 Troubleshooting

**Q : Import échoue "SUPABASE_URL not found"**
- Vérifier `.env` contient `SUPABASE_URL=https://xxx.supabase.co`

**Q : Table 'exercises' manquante**
- Vérifier exécution SQL dans Supabase (pas de copier-coller incomplet)

**Q : Docker build échoue**
- Exécuter : `docker system prune` (libère espace)

**Q : Tests échouent**
- Vérifier : `pip install -r requirements-dev.txt` exécuté

---

## 📊 Résumé Semaine 1

```
Jour 1 (8h)  : Import BD + Exercices  → ✅ 850 exercices
Jour 2-3 (8h): Config + Tests         → ✅ Tests passent
Jour 4-5 (0h): Git + GitHub Actions   → ✅ CI auto

Total       : 16h
Résultat    : Module Strength DÉBLOKÉ
```

**Vous êtes prêt pour Sem 2 (Frontend).** 🚀

---

Commencez **JOUR 1 MAINTENANT**.
