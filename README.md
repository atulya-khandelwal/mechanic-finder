# Mobile Mechanic

A web app that connects customers with mobile mechanics: location-based discovery, emergency and scheduled service requests, booking workflows for users and mechanics, optional online payments (Razorpay), and cash-on-delivery with mechanic confirmation.

## Features

- **Location**: Find mechanics within 10 km (browser geolocation or manual coordinates).
- **Service types**: Emergency (e.g. breakdown, flat tire, battery) and scheduled (e.g. oil change, brakes, cleaning).
- **Bookings**: Vehicle details, photos (Cloudinary), chat per booking, status workflow (pending → accepted → in progress → completed).
- **Auth**: Email + SMS OTP signup (`/register/start` → `/register/verify`), JWT login, roles: `user`, `mechanic`, `admin`.
- **Payments (INR)**: Cash on delivery (default) or pay online with Razorpay from booking details; mechanics can confirm cash received after the job is completed.
- **AI triage (optional)**: Groq-powered suggestion of service category and safety tips from a free-text problem description (requires `GROQ_API_KEY`).
- **Notifications**: Web Push (VAPID) for booking events when configured.
- **Email**: SMTP for OTP and transactional mail when `SMTP_*` is set.
- **SMS**: Twilio Verify for phone codes in production; `PHONE_VERIFY_SKIP` for local dev only.
- **PWA**: Vite PWA plugin; service worker for offline shell caching where enabled.

## Tech stack

| Layer       | Stack |
|------------|--------|
| API        | Node.js 20+, Express, ESM |
| Database   | PostgreSQL |
| Frontend   | React 19, React Router 7, Vite 7 |
| Auth       | JWT (`Authorization: Bearer`) |
| Payments   | Razorpay Orders + Checkout (server-side verify) |

## Prerequisites

- Node.js 20+
- PostgreSQL
- Cloudinary (required for image uploads); optional: Twilio, Razorpay, Groq, SMTP — see `backend/.env.example`

## Quick start

### 1. Database

Create a database and apply the base schema (from repo root):

```bash
createdb mobile_mechanic
cd backend
cp .env.example .env
# Edit .env with DATABASE_URL and JWT_SECRET
npm install
npm run db:init
npm run db:seed
```

`db:seed` loads `database/seed.sql` and creates the admin user (see below).

### 2. Migrations (optional features)

Run these when you need the related columns and features (each reads `DATABASE_URL` from `backend/.env`):

| Script | Purpose |
|--------|---------|
| `npm run db:migrate` | Booking pricing / vehicle details |
| `npm run db:migrate-push` | Push notification subscriptions |
| `npm run db:migrate-razorpay` | `payment_status`, Razorpay IDs |
| `npm run db:migrate-payment-method` | `payment_method` (`cod` / `online`) |

Other scripts under `npm run` (e.g. signup, profile photo) exist for older or incremental DB changes; see `backend/package.json` if your database was created from an older snapshot.

### 3. Backend

```bash
cd backend
npm run dev
```

API: **http://localhost:3001** — health check: `GET /api/health`.

Use `npm start` if `node --watch` hits file-watcher limits on your machine.

### 4. Frontend

```bash
cd frontend
cp .env.example .env
# Optional: see frontend/.env.example for VITE_* variables
npm install
npm run dev
```

Dev server defaults to **http://localhost:5173** (Vite). In `vite.config.js`, `/api` is **proxied** to `VITE_DEV_PROXY_TARGET` or `http://localhost:3001`. The backend must be running or the browser will see proxy errors (`ECONNREFUSED`).

**Production / staging API URL:** set `VITE_API_BASE_URL` in `frontend/.env.production` (or your host’s env) to your public API origin, e.g. `https://api.yourdomain.com`. The app builds that into `src/apiConfig.js` so you do not edit URLs by hand between environments. Leave it unset for local dev (relative `/api` + proxy).

If you use ngrok or another tunnel, point it at the Vite port you actually use (e.g. 5173 or 5174) and add the host to `allowedHosts` in `vite.config.js` if required.

## Default admin (after seed)

From `backend/scripts/seed-db.js`:

- **Email:** `admin@mobilemechanic.com`
- **Password:** `admin123`

Change this in production.

## Environment variables (backend)

Copy `backend/.env.example` to `backend/.env` and fill in what you need. Important groups:

| Area | Variables |
|------|-----------|
| Core | `PORT`, `DATABASE_URL`, `JWT_SECRET` |
| Email OTP | `SMTP_*`, `OTP_*` |
| Phone SMS | `TWILIO_*`, `DEFAULT_PHONE_REGION`, `PHONE_VERIFY_SKIP` (dev only) |
| Push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| Images | `CLOUDINARY_URL` (or `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) — required for uploads |
| AI triage | `GROQ_API_KEY`, `GROQ_MODEL` |
| Payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |

Never commit real secrets. Use test keys for Razorpay and Twilio in development.

## Environment variables (frontend)

Copy `frontend/.env.example` to `frontend/.env` for local overrides. For production builds, use `frontend/.env.production` or your host’s dashboard.

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Optional. Public API origin when the SPA and API are on **different** hosts (e.g. `https://api.example.com`). Omitted in dev → relative `/api` + Vite proxy. |
| `VITE_DEV_PROXY_TARGET` | Dev only. Where Vite proxies `/api` (default `http://localhost:3001`). |
| `VITE_MAPBOX_ACCESS_TOKEN` | Mapbox (see `.env.example`). |
| `VITE_DEFAULT_PHONE_REGION` | Default phone region for validation. |

`VITE_*` values are baked in at **build time** for production; change them and rebuild to switch API URLs.

## API overview

Routes are mounted under `/api` (prefix shown below).

| Prefix | Role |
|--------|------|
| `GET /health` | Liveness |
| `/auth/*` | Login, register (start / verify / resend), `me`, profile, password |
| `/mechanics/*` | Nearby mechanics, mechanic profile |
| `/services/categories` | Service categories |
| `/bookings/*` | Create booking, list mine, single booking, status, assign, claim, reject, messages, `POST .../confirm-cash-payment` (mechanic, COD) |
| `/users/*` | Saved locations |
| `/upload/*` | Authenticated image uploads |
| `/reviews/*` | Reviews after completed jobs |
| `/push/*` | VAPID key, subscribe / unsubscribe |
| `/email/*` | Email-related helpers (if used) |
| `/admin/*` | Admin-only (users, mechanics, bookings, stats) |
| `/ai/*` | `GET /capabilities`, `POST /triage` (Groq, user role) |
| `/payments/*` | `GET /config`, Razorpay create-order / verify |

Refer to `backend/routes/*.js` and `backend/index.js` for the exact paths and methods.

## Project layout

```
backend/          Express app, services, middleware
database/         schema.sql, seeds, SQL migrations
frontend/         Vite + React app (pages, components, api client)
```

## License

ISC (see `backend/package.json`).
