# Mobile Mechanic Application

A web application that connects users with mobile mechanics. Users can find mechanics within 10km, request emergency or scheduled services, and mechanics can manage their profile and bookings.

## Features

- **Location-based search**: Find mechanics within 10km of your location (GPS or manual entry)
- **Two service types**:
  - **Emergency**: Instant service (breakdown, flat tire, battery jump)
  - **Scheduled**: Plan ahead (oil change, brake inspection, cleaning)
- **Three dashboards**:
  - **User**: Find mechanics, book services, view bookings
  - **Mechanic**: Manage profile, accept/complete jobs
  - **Admin**: Overview, users, mechanics, bookings

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: React, Vite
- **Auth**: JWT

## Setup

### 1. Database (PostgreSQL)

Create the database and run schema:

```bash
createdb mobile_mechanic
psql -d mobile_mechanic -f database/schema.sql
```

Or use the backend script:

```bash
cd backend
npm run db:init
npm run db:seed
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials
npm install
npm run dev
```

Backend runs on http://localhost:3001

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173 (proxies API to backend)

### 4. Create Admin User

After running `npm run db:seed`, admin credentials:
- Email: `admin@mobilemechanic.com`
- Password: `admin123`

## Environment Variables (Backend)

| Variable | Description |
|----------|-------------|
| PORT | Server port (default: 3001) |
| DATABASE_URL | PostgreSQL connection string |
| JWT_SECRET | Secret for JWT signing |

## API Endpoints

- `POST /api/auth/register` - Register (user or mechanic)
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user
- `GET /api/mechanics/nearby?lat=&lng=` - Mechanics within 10km
- `GET /api/services/categories` - Service categories
- `POST /api/bookings` - Create booking
- `GET /api/bookings/my` - My bookings
- `PATCH /api/bookings/:id/status` - Update status
- `GET /api/admin/*` - Admin endpoints (admin role required)
