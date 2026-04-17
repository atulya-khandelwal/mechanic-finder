# CLAUDE.md — Mobile Mechanic

## What is this project?

A full-stack web app connecting customers with mobile mechanics. Customers find nearby mechanics, book emergency or scheduled services, chat, pay (COD or Razorpay), and leave reviews. Mechanics manage jobs, track earnings, and communicate with customers. Admins oversee the system.

## Tech stack

- **Frontend**: React 19 + Vite 7, React Router 7, Mapbox GL, PWA (Workbox)
- **Backend**: Node.js 20+ (ESM), Express 4
- **Database**: PostgreSQL (Neon) via `pg` driver
- **Auth**: JWT (HS256, 7-day expiry), bcryptjs, role-based (`user`, `mechanic`, `admin`)
- **Integrations**: Resend (email), Twilio Verify (SMS OTP), Cloudinary (images), Razorpay (payments), Groq (AI triage), Web Push (VAPID)

## Project structure

```
backend/
  index.js          # Express server entry point (port 3001)
  config.js         # Centralized env config
  db.js             # pg.Pool connection
  middleware/auth.js # JWT verify + requireRole()
  routes/           # REST endpoints (auth, bookings, mechanics, services, etc.)
  services/         # Business logic (email, OTP, payments, AI, push, etc.)
  providers/        # Third-party client factories
  scripts/          # DB init/seed/migration scripts
  template/         # HTML email templates

frontend/
  src/
    App.jsx         # React Router, role-based route guards
    api.js          # Centralized fetch client (attaches JWT from AuthContext)
    pages/          # Login, Register, ForgotPassword, ResetPassword,
                    # UserDashboard, MechanicDashboard, AdminDashboard,
                    # LocationGate, UserBookingDetail
    components/     # BookingChat, MapLocationPicker, NotificationPrompt, etc.
    context/        # AuthContext, LocationContext, ThemeContext
    hooks/          # useAuth, useLocation, useMediaQuery, usePushSubscription, useBookingsPolling
    utils/          # phoneValidation, bookingStatus, mapbox, mapsLinks, authErrors
    sw.js           # Service worker (Workbox + push)

database/
  schema.sql        # Full DDL (tables, enums, indexes, Haversine function)
  seed.sql          # Admin user + service categories
  migration-*.sql   # Incremental migrations
```

## Key commands

```bash
# Backend
cd backend && npm install
npm run dev                           # node --watch index.js
npm run db:init                       # Apply schema.sql
npm run db:seed                       # Seed admin + categories
npm run db:seed-test-users-mechanics  # Sample test data
npm run db:migrate                    # Apply all migrations

# Frontend
cd frontend && npm install
npm run dev       # Vite dev server on :5173, proxies /api → :3001
npm run build     # Production build to dist/
npm run lint      # ESLint
```

## Database

- PostgreSQL 15+. Schema in `database/schema.sql`.
- Core tables: `users`, `mechanics`, `service_categories`, `mechanic_services`, `bookings`, `reviews`, `user_locations`, `push_subscriptions`, `password_reset_tokens`, `signup_verifications`
- Enums: `user_role` (user/mechanic/admin), `service_type` (emergency/scheduled), `booking_status` (pending/accepted/in_progress/completed/cancelled/rejected)
- Geospatial: `distance_km()` function using Haversine formula. Mechanics found within 10km radius.
- Booking status machine: `pending → accepted → in_progress → completed` (also `cancelled`, `rejected`)

## API conventions

- All routes under `/api` prefix
- Auth: `Authorization: Bearer <jwt>` header
- JSON request/response bodies
- Route files in `backend/routes/`, each mounted in `index.js`
- Middleware: `authenticate` (JWT verify), `requireRole(...roles)` (authorization)
- File uploads via `multer` → Cloudinary

## Auth flows

1. **Signup**: `POST /api/auth/register/start` (sends email OTP via Resend + SMS OTP via Twilio) → `POST /api/auth/register/verify` (creates user, returns JWT)
2. **Login**: `POST /api/auth/login` with email or phone + password → JWT
3. **Password reset**: `POST /api/auth/forgot-password` (sends magic link email) → `POST /api/auth/reset-password` (verifies token, returns JWT)

## Frontend state management

- React Context API only (no Redux/Zustand)
- `AuthContext`: user profile, JWT, login/logout
- `LocationContext`: browser geolocation, persisted to localStorage
- `ThemeContext`: dark/light mode
- API calls go through `src/api.js` which auto-attaches JWT

## Environment variables

- Backend: `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_APP_URL` are required. Optional integrations: `RESEND_API_KEY`, `TWILIO_*`, `CLOUDINARY_*`, `RAZORPAY_*`, `GROQ_API_KEY`, `VAPID_*`. See `backend/.env.example`.
- Frontend: `VITE_MAPBOX_ACCESS_TOKEN` (required for maps), `VITE_API_BASE_URL` (optional, dev uses proxy). See `frontend/.env.example`.

## Conventions

- Backend uses ES modules (`"type": "module"` in package.json). Use `import`/`export`, not `require`.
- SQL queries use parameterized queries (`$1`, `$2`) — never string interpolation.
- Phone numbers stored in E.164 format. Validated with `libphonenumber-js`.
- Default region is India (`IN`). Currency is INR.
- Passwords hashed with bcryptjs (10 rounds). OTPs hashed with bcryptjs. Reset tokens hashed with SHA-256.
- Image uploads go to Cloudinary, URLs stored in DB.
- Booking prices: `base_charge` + `home_service_fee` + `service_price` = `total_price`
- Payment methods: `'cod'` (cash on delivery) or `'online'` (Razorpay)

## Testing

- No test framework is currently set up.
- For local dev: `PHONE_VERIFY_SKIP=true` skips real SMS verification.
- Default admin: `admin@mobilemechanic.com` / `admin123`

## Common tasks

- **Add a new API route**: Create file in `backend/routes/`, add handler functions, mount in `backend/index.js` with `app.use('/api/routename', router)`.
- **Add a new page**: Create in `frontend/src/pages/`, add route in `App.jsx` with appropriate role guard.
- **Add a DB migration**: Create `database/migration-*.sql`, add npm script in `backend/package.json`.
- **Add a new service integration**: Create service file in `backend/services/`, add env vars to `config.js` and `.env.example`.
