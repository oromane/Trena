# Plan Finition — Trena (MVP → Production)
**État :** 90% complet | **Objectif :** Beta fermée (100 utilisateurs) + Sport-Lylou intégré  
**Timeline :** 4-6 semaines | **Effort :** ~200h (1 dev full-time)

---

## Résumé Exécutif

**Ce qui existe (90%) :**
- ✅ Backend 90% (Banister, TRIMP, HRV, Daily Adjust, Calendar Sync)
- ✅ Frontend 85% (Dashboard, Objectives, Metrics, Auth)
- ✅ Module Strength 100% (7 routes, 219 tests, progression RIR)
- ✅ Tests 80% (25 suites, 40/40 passants)
- ✅ Infrastructure 60% (Docker, VPS, Cloudflare Tunnel)

**Ce qui manque (10%) — CRITIQUE :**
1. **Import Catalogue d'Exercices** — BLOQUANT (sans quoi Strength est mort-né)
2. **Frontend Strength** — Écran de séance (chrono, saisie RIR, clôture)
3. **Fichiers Config/CI** — 4 fichiers critique (requirements-dev.txt, .pre-commit, workflows)
4. **Documentation** — 5 fichiers (DEPLOYMENT.md, TESTING.md, API.md, etc.)
5. **Sport-Lylou** — Intégration dans Trena (optionnel pour MVP, inclure pour finition)

**Verdict :** Pas besoin de recodage majeur. Besoin de :
- 15h : Import exercices + tests
- 20h : Frontend Strength
- 10h : Config/CI/CD
- 5h : Documentation
- **50h total pour 100% production-ready**

---

## Ordre d'Exécution (Critique)

**Sem 1 — Débloquer le moteur (16h)**
```
Day 1-2 : Import exercices (8h)
Day 3   : Config/CI (1h)
Day 3-4 : Tests Router (7h)
Result  : Module Strength 100% fonctionnel
```

**Sem 2-3 — Frontend (30h)**
```
Day 5-9  : Écran Séance (20h)
Day 10-11: Dashboard integration (10h)
Result   : Utilisateur peut faire une séance complète
```

**Sem 4 — Production (15h)**
```
Day 12-14 : Documentation (8h)
Day 15-16 : Déploiement VPS (7h)
Result    : Prêt beta fermée
```

**Sem 5-6 — Sport-Lylou (optionnel, 20h)**
```
Day 17-20 : Cycle + Programme hybride
Result    : Finition complète
```

---

## Commandes de Lancement

### Sem 1 — Import & Config

```bash
# 1. Migrations DB
# → Ouvrez Supabase SQL Editor
# → Copiez migration-strength.sql (fichier dans votre dossier)
# → Exécutez

# 2. Import exercices
python scripts/import_exercises.py
# ✓ 850 exercices importés

# 3. Tests
cd backend-python
pytest tests/ -v
# ✓ 259 passed (219 + 40 new)
```

---

**Commencez par JOUR 1 (8h) — cf. CHECKLIST_LANCEMENT.md**
