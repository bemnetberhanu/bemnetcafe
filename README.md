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

## Free Hosting Setup

The deployment uses three services:

- **Cloudflare Pages** for the admin dashboard and manager PWA.
- **Render** for the Express API. The included [`render.yaml`](./render.yaml) configures a free Node.js web service and prompts for database details without storing them in source control.
- **Aiven MySQL** for restaurant data. Confirm the free plan is available for your account and region; provider plans and limits can change.

This setup is for testing and light use, not guaranteed restaurant operations. Render's free web services sleep after 15 minutes without requests and may take about a minute to wake. Usage and database limits apply.

Never upload `.env` files or put database credentials in a frontend. The root `.gitignore` excludes local environment files.

### 1. Create the MySQL database

1. Create an Aiven MySQL service. Select a free plan only if Aiven offers it for your account and region.
2. Note the service's host, port, database name, username, and password.
3. Download the service's CA certificate if Aiven provides one. The backend verifies TLS certificates when `DB_SSL=true`; don't disable verification to work around connection errors.

### 2. Create the frontend sites on Cloudflare Pages

Create two Pages projects from the GitHub repository using Git integration and the `main` branch:

| Site | Root directory | Build command | Output directory |
|---|---|---|---|
| Admin dashboard | `admin-dashboard` | `npm run build` | `dist` |
| Manager PWA | `manager-app` | `npm run build` | `dist` |

Deploy both projects to get their `pages.dev` URLs. The apps will not connect to a working API until the next step is complete. Cloudflare Pages automatically rebuilds on pushes to the connected branch.

### 3. Deploy the API on Render

1. In Render, choose **New → Blueprint** and connect the GitHub repository `bemnetberhanu/bemnetcafe`. Render reads [`render.yaml`](./render.yaml) and proposes the API service.
2. Confirm the API service uses the `free` plan. Enter the Aiven connection details when prompted for `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.
3. If required by Aiven, enter the downloaded CA certificate as `DB_SSL_CA`.
4. Enter both Cloudflare Pages HTTPS origins into `CORS_ORIGINS`, separated by a comma and without trailing slashes.
5. Render generates a private `JWT_SECRET`. Keep it secret.
6. Deploy the service. Its health endpoint will be `https://YOUR-API.onrender.com/api/health`.

### 4. Create the database tables and initial accounts

Render Shell access requires a paid service plan, so run the one-time database commands from your computer:

1. In the `backend` folder, copy `.env.example` to `.env` and fill in the same Aiven database connection details and CA certificate used by Render.
2. If Aiven restricts allowed IPs, temporarily allow your computer's current public IP address in the Aiven service's connection settings.
3. In a terminal opened in the `backend` folder, run `npm run migrate` once to create the tables.
4. For a new database only, add `INITIAL_ADMIN_PASSWORD` and `INITIAL_MANAGER_PASSWORD` to the local `.env`, using different passwords of at least 12 characters, then run `npm run seed` once.
5. Remove those initial-password entries from `.env` after seeding. The seed adds sample menu and inventory data; replace it before using the system for real. Never seed a database containing real data or run seed as an update. Back up the database before migrations or data changes.

The `.env` file is ignored by Git. Keep it on your computer and never upload it.

To reset one of the initial account passwords, run `npm run reset-password` in `backend` with `RESET_USER_EMAIL` and `RESET_USER_PASSWORD` set in the current terminal. The command only allows the two seeded account emails, requires a password of at least 12 characters, and updates that account without printing the password. Do not rerun the seed script to reset passwords.

### 5. Connect the frontend apps

In both Cloudflare Pages projects, set `VITE_API_URL` to `https://YOUR-API.onrender.com/api`, then trigger a new deployment. Test sign-in and basic data operations in both apps. The manager app requires a personal manager account; it no longer uses a shared public key.

### 6. Run the native mobile app

The Expo app supports both admin and manager accounts. From `mobile-app`, install dependencies and start the development server:

```powershell
cd mobile-app
npm ci
Copy-Item .env.example .env
npx expo start
```

Install an Expo Go build that supports SDK 57 on your phone, then scan the QR code shown by Expo. For a physical iPhone, Expo currently distributes SDK 57 Expo Go through `eas go` and TestFlight, which requires Apple Developer Program membership; the App Store build may not support SDK 57. The app uses the hosted API by default; `EXPO_PUBLIC_API_URL` in the local, Git-ignored `.env` can override it. Keep `.env` private.

To verify the Android JavaScript bundle without a device or emulator, run `npx expo export --platform android`. An installable Android build additionally requires Android Studio/SDK and a compatible Java version.

### Updates

- Push code changes to GitHub `main`; Render and Cloudflare Pages build and deploy updates automatically.
- If the API URL or frontend domains change, update `VITE_API_URL` on both Pages projects, `EXPO_PUBLIC_API_URL` in the mobile app's local `.env`, and `CORS_ORIGINS` on Render.
- Back up the database regularly. Do not run `npm run seed` as an update.
