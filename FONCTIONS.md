# Sport Tracker — Documentation technique

> Référence complète pour reprise en session Claude. Décrit l'état actuel du code, la structure, les endpoints, et les choix d'implémentation.

---

## Stack Docker (`name: sport`)

| Service | Image | Rôle | Port interne |
|---|---|---|---|
| `postgres` | postgres:16-alpine | Base de données principale | 5432 |
| `backend` | build `./backend` | API REST Node.js/Express | 3001 |
| `frontend` | build `./frontend` | SPA React (Vite + serve) | 3000 |
| `nginx` | nginx:alpine | Reverse proxy interne | 80 |
| `grafana` | grafana/grafana:latest | Dashboards graphiques | 3000 |
| `adminer` | adminer:latest | Admin base de données | 8080 |
| `mailpit` | axllent/mailpit:latest | Serveur SMTP + UI web emails | 8025 (UI), 1025 (SMTP) |
| `telegram-bot` | build `./telegram-bot` | Bot Telegram (chat_id lookup) | — |

**Réseau Docker :** `sport-net` (bridge interne) + `frontend` (réseau externe Traefik)

**Accès public via Traefik (réseau `frontend` externe) :**
- `http://sport.xavierchapouille.ddns.net` → nginx → frontend/backend
- `http://mail.xavierchapouille.ddns.net` → mailpit UI

**nginx (`./nginx/nginx.conf`) :**
- `resolver 127.0.0.11` — DNS Docker dynamique (évite 502 après rebuild)
- `/` → `frontend:3000`
- `/api/` → `backend:3001` (rewrite strip `/api` prefix)
- `/grafana/` → `grafana:3000`
- `/adminer/` → `adminer:8080`

---

## Variables d'environnement (`.env`)

```env
POSTGRES_DB=sport
POSTGRES_USER=sport_user
POSTGRES_PASSWORD=<fort>
JWT_SECRET=<long_aléatoire>
GRAFANA_USER=admin
GRAFANA_PASSWORD=<fort>
APP_URL=http://sport.xavierchapouille.ddns.net
SMTP_FROM=Sport Tracker <noreply@sport.local>
MAILPIT_USER=admin
MAILPIT_PASSWORD=<fort>
TELEGRAM_BOT_TOKEN=<token_BotFather>
```

---

## Base de données PostgreSQL

### Table `users`
```sql
id SERIAL PK
username VARCHAR(50) UNIQUE NOT NULL
email VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
role VARCHAR(10) DEFAULT 'user'  -- 'admin' | 'user'
phone VARCHAR(20)                -- optionnel
telegram_chat_id VARCHAR(50)     -- optionnel, pour notifications
created_at TIMESTAMPTZ
```

### Table `items`
```sql
id SERIAL PK
name VARCHAR(100) NOT NULL
description TEXT
unit VARCHAR(30) DEFAULT 'reps'  -- reps | km | min | kg | series
created_by INTEGER → users(id)
created_at TIMESTAMPTZ
```

### Table `goals`
```sql
id SERIAL PK
user_id INTEGER → users(id) CASCADE
item_id INTEGER → items(id) CASCADE
target NUMERIC(10,2) NOT NULL    -- valeurs décimales autorisées
goal_type VARCHAR(3) DEFAULT 'min'  -- 'min' (atteindre) | 'max' (ne pas dépasser)
period VARCHAR(10) DEFAULT 'daily'  -- 'daily' | 'weekly'
UNIQUE (user_id, item_id)
```

### Table `logs`
```sql
id SERIAL PK
user_id INTEGER → users(id) CASCADE
item_id INTEGER → items(id) CASCADE
quantity NUMERIC(10,2) NOT NULL CHECK (quantity >= 0)  -- 0 autorisé
logged_at TIMESTAMPTZ DEFAULT NOW()
note TEXT
```
Index : `(user_id, item_id, logged_at DESC)` et `(logged_at DESC)`

### Table `password_reset_tokens`
```sql
id SERIAL PK
user_id INTEGER → users(id) CASCADE
token VARCHAR(64) UNIQUE NOT NULL
expires_at TIMESTAMPTZ NOT NULL  -- 24h après création
created_at TIMESTAMPTZ
```

**Fichiers SQL :**
- `postgres/init.sql` — création complète (fresh install)
- `postgres/migrate.sql` — migrations pour installation existante

**Compte admin par défaut :** `admin@sport.local` / `admin123` (à changer)

---

## Backend (`./backend/src/index.js`)

Node.js + Express. Toutes les routes nécessitent JWT sauf auth.

### Authentification

| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/register` | Inscription — body: `{ username, email, password, phone? }` |
| POST | `/auth/login` | Connexion — body: `{ email, password }` → `{ token, user }` |
| POST | `/auth/forgot-password` | body: `{ email }` → envoie lien reset via mailpit |
| GET | `/auth/reset-password/:token` | Valide token — `{ valid, username }` |
| POST | `/auth/reset-password/:token` | body: `{ password }` → met à jour mdp |

JWT 7 jours. Header : `Authorization: Bearer <token>`

### Profil utilisateur

| Méthode | Route | Description |
|---|---|---|
| GET | `/profile` | Récupère profil courant (phone, telegram_chat_id) |
| PUT | `/profile` | body: `{ phone?, telegram_chat_id? }` |

### Gestion utilisateurs (admin seulement)

| Méthode | Route | Description |
|---|---|---|
| GET | `/users` | Liste tous les utilisateurs |
| DELETE | `/users/:id` | Supprime utilisateur |
| PATCH | `/users/:id/role` | body: `{ role }` — change rôle |

### Items (exercices)

| Méthode | Route | Description |
|---|---|---|
| GET | `/items` | Liste tous les items (tous utilisateurs voient tout) |
| POST | `/items` | Créer item — body: `{ name, description?, unit? }` |
| DELETE | `/items/:id` | Supprimer (admin seulement) |

### Objectifs

| Méthode | Route | Description |
|---|---|---|
| GET | `/goals` | Objectifs de l'utilisateur courant |
| POST | `/goals` | Créer/modifier — body: `{ item_id, target, goal_type, period }` — upsert sur `(user_id, item_id)` |

### Logs (saisie journalière)

| Méthode | Route | Description |
|---|---|---|
| GET | `/logs` | Query params: `item_id?`, `from?`, `to?` |
| POST | `/logs` | body: `{ item_id, quantity, note?, logged_at? }` → déclenche notification Telegram si objectif atteint/dépassé |
| DELETE | `/logs/:id` | Supprimer (propriétaire seulement) |

**Notification Telegram au POST `/logs` :**
- Calcule total du jour pour l'item
- Si `goal_type=min` et total vient de franchir `target` → envoie ✅
- Si `goal_type=max` et total dépasse `target` → envoie ⚠️
- Envoie uniquement si `telegram_chat_id` renseigné dans profil

### Statistiques

| Méthode | Route | Description |
|---|---|---|
| GET | `/stats` | Query: `item_id`, `period` (1w/1m/3m/6m/1y/all), `user_id` (me/all/id) |

`user_id=all` → agrégat tous utilisateurs (accessible à tous)  
`user_id=<id>` → utilisateur spécifique (admin seulement)

### Dépendances backend
`express`, `cors`, `pg`, `bcrypt`, `jsonwebtoken`, `crypto` (natif), `nodemailer`, `https` (natif)

---

## Frontend (`./frontend/src/`)

React 18 + Vite. Router : `react-router-dom`. Charts : `chart.js` + `react-chartjs-2`. Datepicker : `react-datepicker`.

### Structure fichiers

```
src/
├── main.jsx              — point d'entrée
├── App.jsx               — routes + AuthProvider
├── AuthContext.jsx       — contexte auth (user, login, logout) → localStorage
├── api.js                — toutes les fonctions fetch vers /api
├── useSwipe.js           — hook swipe mobile (navigation gauche/droite)
├── styles.css            — design system sombre (CSS variables)
└── pages/
    ├── LoginPage.jsx      — connexion / inscription / mot de passe oublié
    ├── ResetPasswordPage.jsx — réinitialisation mot de passe via token URL
    ├── Layout.jsx         — sidebar desktop + bottom nav mobile + swipe
    ├── DashboardPage.jsx  — jauges objectifs du jour (vert=atteint, rouge=max dépassé)
    ├── ItemsPage.jsx      — liste items + formulaire ajout + définition objectifs
    ├── LogPage.jsx        — saisie quantité + datepicker + historique du jour
    ├── StatsPage.jsx      — graphique linéaire Chart.js + sélecteur période + scope utilisateur
    ├── AdminPage.jsx      — gestion utilisateurs (admin seulement)
    └── ProfilePage.jsx    — téléphone + telegram_chat_id
```

### Routes React

| Path | Page | Auth |
|---|---|---|
| `/login` | LoginPage | public |
| `/reset-password?token=` | ResetPasswordPage | public |
| `/dashboard` | DashboardPage | ✓ |
| `/items` | ItemsPage | ✓ |
| `/log` | LogPage | ✓ |
| `/stats` | StatsPage | ✓ |
| `/profile` | ProfilePage | ✓ |
| `/admin` | AdminPage | admin |

### Navigation mobile (`useSwipe.js`)
- Swipe gauche → page suivante, droite → page précédente
- Ordre : dashboard → items → log → stats → profile → admin
- Bottom nav bar fixe visible sur écrans `≤ 640px`
- Sidebar cachée sur mobile

### Dashboard (`DashboardPage.jsx`)
- Charge items + goals + logs du jour
- Calcule total par item
- Jauge : bleu = en cours, vert = objectif min atteint, rouge = objectif max dépassé
- Badge ⚠️ si max dépassé

### Statistiques (`StatsPage.jsx`)
- Sélecteur item + sélecteur période (Global/1an/6mois/3mois/1mois/1semaine)
- Scope : 👤 Mon suivi | 👥 Tous | sélecteur utilisateur (admin)
- Ligne objectif pointillée verte si scope=me et objectif défini
- Tiles : total période, moyenne/jour actif, jours enregistrés

### Design
Variables CSS principales :
- `--bg: #0f172a`, `--surface: #1e293b`, `--accent: #3b82f6`
- `--success: #22c55e`, `--danger: #ef4444`, `--muted: #94a3b8`

---

## Telegram Bot (`./telegram-bot/index.js`)

Node.js + `node-telegram-bot-api`. Mode polling.

- `/start` → répond avec le Chat ID de l'utilisateur
- `/id` → même réponse courte

**Usage utilisateur :**
1. Créer bot via `@BotFather` → obtenir token → mettre dans `.env`
2. Ouvrir le bot → `/start` → copier le Chat ID
3. Coller dans `👤 Mon profil` → sauvegarder
4. Notifications automatiques lors des saisies de logs

---

## Mailpit (`./`)

SMTP interne sur `mailpit:1025` — pas d'authentification requise depuis le backend.  
UI web protégée par basic auth (`MAILPIT_USER` / `MAILPIT_PASSWORD`).  
Stocke jusqu'à 500 messages.

**Relay externe optionnel** (décommenter dans `docker-compose.yml`) :
```yaml
MP_SMTP_RELAY_HOST: smtp.gmail.com
MP_SMTP_RELAY_PORT: 587
MP_SMTP_RELAY_USER: votre@gmail.com
MP_SMTP_RELAY_PASSWORD: app_password
```

---

## Procédures

### Première installation
```bash
cd ~
git clone https://github.com/XPouPouille/Sport.git
cd Sport
cp .env.example .env
# Éditer .env — remplir tous les changeme_*
docker compose up -d --build
```

### Mise à jour
```bash
cd ~/Sport && git pull
docker compose up -d --build
sudo docker restart sport-nginx  # si 502 après rebuild
```

### Migration DB (si installation existante)
```bash
sudo docker cp postgres/migrate.sql sport-postgres:/tmp/migrate.sql
sudo docker exec sport-postgres psql -U sport_user -d sport -f /tmp/migrate.sql
```

### Logs
```bash
docker compose logs -f <service>   # backend | frontend | nginx | telegram-bot
```

### Problème 502 Bad Gateway
Cause : nginx a mis en cache l'ancienne IP d'un container rebuilté.  
Fix : `sudo docker restart sport-nginx`  
Permanent : `nginx.conf` utilise `resolver 127.0.0.11` + variables `$upstream_*`

---

## Repo Git

`https://github.com/XPouPouille/Sport.git` — branche `master`
