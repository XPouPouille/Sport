# Sport Tracker

Application de suivi d'exercices sportifs avec gestion utilisateurs, objectifs quotidiens/hebdomadaires et graphiques de progression.

**URL :** https://sport.xavierchapouille.ddns.net

---

## Prérequis

- Docker + Docker Compose
- Réseau Docker externe `traefik` existant (`docker network create traefik`)

---

## Installation

### 1. Se placer dans le répertoire utilisateur

```bash
cd ~
```

### 2. Cloner le dépôt

```bash
git clone https://github.com/XPouPouille/Sport.git
cd Sport
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditer `.env` et remplacer toutes les valeurs `changeme_*` :

```env
POSTGRES_DB=sport
POSTGRES_USER=sport_user
POSTGRES_PASSWORD=<mot_de_passe_fort>
JWT_SECRET=<chaine_aleatoire_longue>
GRAFANA_USER=admin
GRAFANA_PASSWORD=<mot_de_passe_fort>
```

### 4. Démarrer le stack

```bash
docker compose up -d --build
```

---

## Accès

| Service    | URL                                              |
|------------|--------------------------------------------------|
| Application | https://sport.xavierchapouille.ddns.net         |
| Grafana    | https://sport.xavierchapouille.ddns.net/grafana  |
| Adminer    | https://sport.xavierchapouille.ddns.net/adminer  |

**Compte admin par défaut :** `admin@sport.local` / `admin123`  
> ⚠️ Changer le mot de passe immédiatement après la première connexion.

---

## Fonctionnalités

- **Gestion utilisateurs** — rôles admin / user, inscription, connexion JWT
- **Exercices** — créés par les utilisateurs, avec unité personnalisable
- **Objectifs** — quotidiens ou hebdomadaires par exercice
- **Saisie journalière** — quantité + note, sélection de date (datepicker)
- **Statistiques** — graphique linéaire avec périodes : Global / 1 an / 6 mois / 3 mois / 1 mois / 1 semaine
- **Grafana** — dashboards avancés connectés à PostgreSQL
- **Adminer** — interface administration base de données

---

## Arrêter / mettre à jour

```bash
# Arrêter
docker compose down

# Mettre à jour (rebuild images)
docker compose up -d --build

# Voir les logs
docker compose logs -f
```
