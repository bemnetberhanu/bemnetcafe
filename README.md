# 🇪🇹 Habesha Restaurant Management System

A full-stack restaurant management system for an Ethiopian restaurant, consisting of:

- **Backend API** — Node.js + Express + MySQL
- **Admin Dashboard** — React + Vite (web, for the owner)
- **Manager App** — React PWA (mobile-optimized, for the on-site manager)

---

## System Architecture

```
├── backend/           Node.js + Express API
│   ├── src/
│   │   ├── controllers/   Route handlers
│   │   ├── services/      Business logic (inventory, notifications, financials)
│   │   ├── routes/        Express routers
│   │   ├── middleware/     Auth (JWT), validation
│   │   ├── scheduler/     Daily cron jobs (9 AM low-stock check)
│   │   └── database/      Migration + seed scripts
├── admin-dashboard/   React Admin UI (port 3000)
└── manager-app/       React PWA Manager App (port 3001)
```

---

## Quick Start

### 1. Database Setup

Create a MySQL database named `habesha_restaurant` (MySQL 8 recommended):
```sql
CREATE DATABASE habesha_restaurant CHARACTER SET utf8mb4;
```

### 2. Backend Setup

```bash
cd backend
copy .env.example .env
# Edit .env with your database credentials and JWT secret
npm install
npm run migrate    # Create all tables
npm run seed       # Add sample data and local development accounts
npm run dev        # Start API on port 5001
```

The seed script creates local development accounts:
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@habesha.com | Development-only; see `backend/src/database/seed.js` |
| Manager | manager@habesha.com | Development-only; see `backend/src/database/seed.js` |

Do not use the development passwords in production. The Manager App requires a manager or admin account and password.

### 3. Admin Dashboard

```bash
cd admin-dashboard
npm install
npm run dev        # Opens at http://localhost:3000
```

### 4. Manager App

```bash
cd manager-app
npm install
npm run dev        # Opens at http://localhost:3001
```

---

## API Endpoints

### Auth
| Method | Route | Access |
|--------|-------|--------|
| POST | /api/auth/login | Public |
| GET | /api/auth/me | All |
| POST | /api/auth/change-password | All |

### Ingredients
| Method | Route | Access |
|--------|-------|--------|
| GET | /api/ingredients | All |
| POST | /api/ingredients | Admin |
| PUT | /api/ingredients/:id | Admin |
| DELETE | /api/ingredients/:id | Admin |

### Menu
| Method | Route | Access |
|--------|-------|--------|
| GET | /api/menu | All |
| POST | /api/menu | Admin |
| PUT | /api/menu/:id | Admin |
| DELETE | /api/menu/:id | Admin |
| POST | /api/menu/variations/create | Admin |

### Orders ⚡ (Core inventory logic)
| Method | Route | Access |
|--------|-------|--------|
| GET | /api/orders | All |
| GET | /api/orders/:id | All |
| POST | /api/orders | Manager/Admin |

> Placing an order: checks stock → rejects with shortage details if insufficient → deducts inventory → saves order.

### Purchases
| Method | Route | Access |
|--------|-------|--------|
| GET | /api/purchases | All |
| POST | /api/purchases | Manager/Admin |

> Recording a purchase automatically increases `current_quantity` and clears low-stock alerts.

### Analytics
| Method | Route | Access |
|--------|-------|--------|
| GET | /api/analytics/financial | All |
| GET | /api/analytics/ranking | All |
| GET | /api/analytics/patterns | All |
| GET | /api/analytics/daily-summary | All |

### Notifications
| Method | Route | Access |
|--------|-------|--------|
| GET | /api/notifications | All |
| GET | /api/notifications/unread | All |
| PATCH | /api/notifications/:id/read | All |
| POST | /api/notifications/trigger-stock-check | Admin |

---

## Key Business Logic

### 1. Inventory Deduction (Order Placement)
When an order is placed:
1. Aggregate total ingredient requirements across all ordered items + variations
2. Check all required ingredients have sufficient `current_quantity`
3. If any shortage: reject the order and return which ingredients are short
4. If all OK: deduct quantities from inventory → save order

Variation overrides supported:
- `override` — replaces the base recipe quantity for that ingredient
- `add` — adds on top of base recipe quantity (e.g., extra spice)
- `remove` — removes an ingredient from the recipe entirely

### 2. Daily "Nag" Notification (Scheduler)
- Cron job runs every day at **9:00 AM** (Africa/Addis_Ababa timezone)
- Checks all ingredients where `current_quantity ≤ reorder_level`
- Creates a notification entry in the database for each low item
- **Persists daily** until the ingredient is restocked via a Purchase entry
- Manager sees these in the Notifications/Inventory Hub screen with badge counts

### 3. Financial Calculations
- **Revenue**: Sum of order `total_amount`
- **COGS**: Sum of `ingredient cost_per_unit × quantity_used` per sold item
- **Operating Costs**: Sum of expenses for the period
- **Net Profit**: Revenue − (COGS + Operating Costs)

---

## Production Deployment on Railway

The project is not online yet. This setup uses Railway for the API and MySQL database, and Railway services with Caddy for both websites. You need a private GitHub repository connected to Railway. The root `.gitignore` excludes dependency folders, build output, and `.env` files. Never upload real `.env` files.

### One-time setup

1. Create a **private** GitHub repository and upload this project.
2. In Railway, create a project from that GitHub repository. Add a MySQL database service using **New → Database → MySQL**.
3. Add the backend as a service from the same repository. Set its root directory to `/backend`, install command to `npm ci`, and start command to `npm start`.
4. In the backend service, add:
   - `NODE_ENV` = `production`
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` as references to the matching variables in the Railway MySQL service (`MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, and `MYSQLPASSWORD`).
   - `JWT_SECRET` = a newly generated random value of at least 32 characters.
   - `CORS_ORIGINS` = the two website origins after you create them, separated by a comma and without trailing slashes.
5. Deploy the backend and generate a public domain in its Railway service settings. Its health check is `/api/health`.
6. Add two more services from the same repository:
   - Admin site root directory: `/admin-dashboard`
   - Manager site root directory: `/manager-app`
   
   Each folder contains a `Dockerfile` that builds the React app and a `Caddyfile` that serves it, supports page refreshes, and forwards `/api` requests to the backend. For each site, add an `API_URL` variable containing the backend's public origin (for example, `https://your-api.up.railway.app`, without `/api`).
7. Generate a public domain for each website. Set backend `CORS_ORIGINS` to those two exact HTTPS origins, then redeploy the backend.
8. Run `npm run migrate` once from the backend service's command console to create the database tables.
9. If this is a brand-new database, you may run `npm run seed` once to create starter menu data and the first admin and manager accounts. Before doing so, add `INITIAL_ADMIN_PASSWORD` and `INITIAL_MANAGER_PASSWORD` to the backend environment, each with a unique password of at least 12 characters. Remove those two variables after seeding. The seed also inserts example restaurant data; review and replace it before real use. Do not run the seed on a database that already contains restaurant data.

### Updates and backups

- Once connected, pushing a code change to the deployment branch starts a new build and deployment. Check Railway deployment logs if a build fails.
- If the backend domain changes, update `API_URL` in both frontend services and redeploy them.
- Before database migrations or significant updates, take a database backup. Schedule automatic backups and make sure you know how to restore one.
- Never run `npm run seed` as a routine update; it is for initializing a new database only.
- The Manager App uses individual account sign-in; do not add a shared API key to frontend code or environment variables prefixed with `VITE_`.
