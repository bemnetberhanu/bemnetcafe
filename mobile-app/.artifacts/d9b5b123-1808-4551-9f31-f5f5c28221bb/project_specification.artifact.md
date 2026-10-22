# 🇪🇹 Habesha Restaurant Management System — Complete Technical Specification

Use this comprehensive technical specification to recreate, understand, or continue developing the Habesha Restaurant Management System. It contains all architectural details, database schemas, API routes, business logic rules, and frontend structure.

---

## 1. Project Overview

The **Habesha Restaurant Management System** is a full-stack restaurant management solution tailored for an Ethiopian restaurant. It consists of:
1. **Backend API**: Node.js + Express + MySQL (RESTful API with JWT auth and API key auth).
2. **Admin Dashboard**: React + Vite web dashboard for owners/admins (full financial reporting, analytics, menu/inventory management, user management).
3. **Manager Mobile App**: React Native / Expo Router (Expo SDK 51) mobile app for on-site managers/staff (New Order / POS with stock validation, purchases, expenses, alerts/notifications, and daily summary).

---

## 2. Tech Stack

- **Backend**: Node.js, Express, MySQL (`mysql2/promise`), `jsonwebtoken`, `bcryptjs`, `express-rate-limit`, `helmet`, `node-cron`, `dotenv`.
- **Mobile App**: React Native (`0.74.5`), Expo (`~51.0.28`), Expo Router (`~3.5.23`), Zustand state management, Axios, `expo-secure-store`, React Native Safe Area Context.
- **Database**: MySQL (`habesha_restaurant`) running via XAMPP / local MySQL on port `3306`.

---

## 3. Database Schema (`habesha_restaurant`)

### Tables & Relationships:
1. **`users`**
   - `id` (INT, PK, AUTO_INCREMENT)
   - `name` (VARCHAR)
   - `email` (VARCHAR, UNIQUE)
   - `password_hash` (VARCHAR)
   - `role` (ENUM: `'admin'`, `'manager'`, `'staff'`)
   - `created_at` (TIMESTAMP)

2. **`ingredients`**
   - `id` (INT, PK, AUTO_INCREMENT)
   - `name` (VARCHAR)
   - `unit_of_measure` (VARCHAR: e.g., `'kg'`, `'liters'`, `'pieces'`O
   - `current_quantity` (DECIMAL)
   - `reorder_level` (DECIMAL)
   - `cost_per_unit` (DECIMAL)
   - `is_low_stock` (BOOLEAN, generated/checked)

3. **`menu_items`**
   - `id` (INT, PK, AUTO_INCREMENT)
   - `name` (VARCHAR)
   - `category` (VARCHAR: e.g., `'Doro Wat'`, `'Injera'`, `'Drinks'`)
   - `selling_price` (DECIMAL)
   - `is_available` (BOOLEAN)

4. **`recipe_ingredients`** (Junction table linking menu items to required raw ingredients)
   - `id` (INT, PK)
   - `menu_item_id` (INT, FK -> `menu_items.id`)
   - `ingredient_id` (INT, FK -> `ingredients.id`)
   - `quantity_required` (DECIMAL)

5. **`item_variations`** (e.g., size or spice variations)
   - `id` (INT, PK)
   - `menu_item_id` (INT, FK -> `menu_items.id`)
   - `name` (VARCHAR: e.g., `'Large'`, `'Extra Spicy'`)
   - `price_adjustment` (DECIMAL)

6. **`variation_ingredients`** (Variation-specific ingredient overrides)
   - `id` (INT, PK)
   - `variation_id` (INT, FK -> `item_variations.id`)
   - `ingredient_id` (INT, FK -> `ingredients.id`)
   - `action` (ENUM: `'override'`, `'add'`, `'remove'`)
   - `quantity` (DECIMAL)

7. **`orders`**
   - `id` (INT, PK, AUTO_INCREMENT)
   - `user_id` (INT, FK -> `users.id`, nullable for manager POS)
   - `total_amount` (DECIMAL)
   - `payment_method` (ENUM: `'cash'`, `'card'`, `'other'`)
   - `status` (ENUM: `'completed'`, `'cancelled'`)
   - `created_at` (TIMESTAMP)

8. **`order_items`**
   - `id` (INT, PK)
   - `order_id` (INT, FK -> `orders.id`)
   - `menu_item_id` (INT, FK -> `menu_items.id`)
   - `variation_id` (INT, FK -> `item_variations.id`, nullable)
   - `quantity` (INT)
   - `unit_price` (DECIMAL)

9. **`purchases`** (Restocking inventory)
   - `id` (INT, PK)
   - `ingredient_id` (INT, FK -> `ingredients.id`)
   - `quantity_purchased` (DECIMAL)
   - `total_cost` (DECIMAL)
   - `purchased_by` (INT, FK -> `users.id`)
   - `created_at` (TIMESTAMP)

10. **`expenses`** (Operating costs)
    - `id` (INT, PK)
    - `category` (VARCHAR: e.g., `'Rent'`, `'Utilities'`, `'Salaries'`)
    - `amount` (DECIMAL)
    - `description` (TEXT)
    - `expense_date` (DATE)

11. **`notifications`**
    - `id` (INT, PK)
    - `title` (VARCHAR)
    - `message` (TEXT)
    - `type` (VARCHAR: `'low_stock'`, `'alert'`)
    - `is_read` (BOOLEAN)
    - `created_at` (TIMESTAMP)

---

## 4. Complete REST API Endpoints Reference (Base URL: `/api`)

### Auth (`/api/auth`)
- `POST /login` — Authenticate admin email/password, returns JWT token & user object.
- `GET /me` — Get current logged-in user profile.
- `POST /change-password` — Change password for authenticated user.

### Menu (`/api/menu`)
- `GET /` — List all menu items with ingredients and variations.
- `POST /` (Admin) — Create menu item.
- `PUT /:id` (Admin) — Update menu item.
- `DELETE /:id` (Admin) — Delete menu item.

### Ingredients (`/api/ingredients`)
- `GET /` — List all ingredients and current stock levels.
- `POST /` (Admin) — Create ingredient.
- `PUT /:id` (Admin) — Update ingredient stock/reorder level.
- `DELETE /:id` (Admin) — Delete ingredient.

### Orders (`/api/orders`) ⚡ (Core Inventory Logic)
- `GET /` — List orders with filters (date, status).
- `GET /:id` — Get order details including items.
- `POST /` (Manager/Admin) — Place an order.
  - *Behavior*: Aggregates ingredient requirements across all ordered items and variations. Checks stock availability. If any ingredient is insufficient, rejects order with detailed shortage list (`400 Bad Request`). If sufficient, atomically deducts inventory quantities and records order.

### Purchases (`/api/purchases`)
- `GET /` — List purchase restock history.
- `POST /` — Record a purchase. Automatically increases ingredient `current_quantity` and resolves low-stock alerts.

### Expenses (`/api/expenses`)
- `GET /` — List operating expenses.
- `POST /`, `PUT /:id`, `DELETE /:id` — Manage expenses.

### Analytics (`/api/analytics`)
- `GET /daily-summary?date=YYYY-MM-DD` — Daily orders, revenue, cash vs card, top selling items.
- `GET /financial?start_date=...&end_date=...&group_by=day` — Revenue, COGS, operating costs, and Net Profit.
- `GET /ranking?days=30` — Best selling menu items.
- `GET /patterns?days=30` — Order peak times/patterns.

### Notifications (`/api/notifications`)
- `GET /` — List notifications.
- `GET /unread` — Unread count for notification badge.
- `PATCH /:id/read` — Mark notification as read.
- `PATCH /all/read` — Mark all notifications as read.

### Users (`/api/users`)
- `GET /`, `POST /`, `PUT /:id`, `PATCH /:id/reset-password`, `DELETE /:id` (Admin) — Staff/Admin user management.

---

## 5. Mobile App Architecture (React Native + Expo Router)

- **Entry Point & Auth Gate**: `app/_layout.jsx` wraps the app with `SafeAreaProvider`, initializes auth state from `expo-secure-store`, and routes users based on role (`admin` -> `/(admin)/dashboard`, `manager` -> `/(manager)/pos`, unauthenticated -> `/(auth)/login`).
- **Admin Tab Navigator (`app/(admin)/_layout.jsx`)**:
  - Dashboard (`dashboard.jsx`)
  - Financials (`financial.jsx`)
  - Ranking (`ranking.jsx`)
  - Orders (`orders.jsx`)
  - Menu (`menu.jsx`)
  - Ingredients (`ingredients.jsx`)
  - Expenses (`expenses.jsx`)
  - Users (`users.jsx`)
  - More (`more.jsx`)
- **Manager Tab Navigator (`app/(manager)/_layout.jsx`)**:
  - POS / New Order (`pos.jsx`) with category filter, variation modal, and live cart.
  - Purchases (`purchases.jsx`)
  - Expenses (`expenses.jsx`)
  - Alerts/Notifications (`notifications.jsx`) with live unread badge polling.
  - Daily Summary (`summary.jsx`)
- **Design System (`src/theme/index.js`)**:
  - Warm Ethiopian gold primary color (`#c8860a`), dark sidebar/headers (`#1c1410`), light off-white background (`#f8f5f0`), reusable components (`Button`, `Input`, `Badge`, `Header`, `StatCard`).

---

## 6. Key Business Logic Rules

1. **Inventory Deduction on Order**:
   - Order submission calculates all required ingredient quantities (factoring in base recipe + variation overrides/additions/removals).
   - If `current_quantity < required_quantity` for any ingredient, the order is rejected and returns `{ shortages: [...] }`.
   - If stock is sufficient, `current_quantity` is decremented atomically.
2. **Restocking via Purchases**:
   - Recording a purchase adds to `current_quantity` and clears low-stock flags (`is_low_stock`).
3. **Daily Notification Cron Job**:
   - A scheduled cron job runs daily at 9:00 AM (`backend/src/scheduler/cronJobs.js`), checks items where `current_quantity <= reorder_level`, and generates persistent notifications until restocked.
4. **Financial Calculations**:
   - $\text{Net Profit} = \text{Revenue} - (\text{COGS} + \text{Operating Costs})$
   - $\text{COGS} = \sum (\text{ingredient } \text{cost\_per\_unit} \times \text{quantity used})$
