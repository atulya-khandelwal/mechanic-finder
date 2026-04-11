# Mobile Mechanic - Architectural Design Document

> **Version:** 1.0  
> **Date:** 2026-04-11  
> **Status:** Living Document

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [System Architecture Diagram](#3-system-architecture-diagram)
4. [Technology Stack Summary](#4-technology-stack-summary)
5. [Backend Architecture](#5-backend-architecture)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Database Design](#7-database-design)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Services & Third-Party Integrations](#9-services--third-party-integrations)
   - 9.1 [Database: Neon PostgreSQL](#91-database---neon-postgresql)
   - 9.2 [Image Storage: Cloudinary](#92-image-storage---cloudinary)
   - 9.3 [Email: Resend](#93-email---resend)
   - 9.4 [SMS/OTP: Twilio Verify](#94-smsotp---twilio-verify)
   - 9.5 [Payments: Razorpay](#95-payments---razorpay)
   - 9.6 [AI Triage: Groq](#96-ai-triage---groq)
   - 9.7 [Maps: Mapbox GL](#97-maps---mapbox-gl)
   - 9.8 [Push Notifications: Web Push (VAPID)](#98-push-notifications---web-push-vapid)
   - 9.9 [PWA: Workbox (via vite-plugin-pwa)](#99-pwa---workbox-via-vite-plugin-pwa)
10. [API Design](#10-api-design)
11. [Core Feature Flows](#11-core-feature-flows)
12. [Security Architecture](#12-security-architecture)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Scalability Considerations](#14-scalability-considerations)

---

## 1. Project Overview

**Mobile Mechanic** is a full-stack web application that connects customers with nearby mobile mechanics for both emergency roadside assistance and scheduled vehicle maintenance. The platform supports location-based discovery, real-time booking workflows, in-app chat, online/COD payments, push notifications, AI-powered problem triage, and a complete admin management dashboard.

### Key User Roles

| Role | Description |
|------|-------------|
| **Customer (user)** | Searches for nearby mechanics, creates bookings, tracks service status, makes payments, leaves reviews |
| **Mechanic** | Manages availability, claims/rejects nearby jobs, updates job status, confirms cash payments, views analytics |
| **Admin** | Manages users, mechanics, bookings; views system-wide stats and dashboards |

---

## 2. High-Level Architecture

The application follows a **client-server monolith** architecture with clear separation between a React SPA frontend and an Express.js REST API backend, connected to a managed PostgreSQL database and multiple third-party SaaS integrations.

```
Architecture Style:  Three-tier (Presentation, Application, Data)
Communication:       REST over HTTPS (JSON)
Authentication:      Stateless JWT tokens
State Management:    Server-side (PostgreSQL) + Client-side (React Context + localStorage)
Notification Model:  Push-based (Web Push API with VAPID)
```

### Design Principles

- **Service-oriented backend** - Business logic is encapsulated in service modules, keeping routes thin
- **Stateless API** - No server-side sessions; JWT tokens carry auth state
- **Progressive enhancement** - PWA support for offline shell caching and push notifications
- **Separation of concerns** - Providers (third-party clients), services (business logic), routes (HTTP handling), and middleware (cross-cutting concerns) are cleanly separated
- **Role-based access control** - Middleware-enforced role checks at the route level

---

## 3. System Architecture Diagram

```
                                    +------------------+
                                    |   Cloudinary     |
                                    |  (Image CDN)     |
                                    +--------+---------+
                                             |
+-------------------+                        |
|                   |    HTTPS/REST           |
|   React SPA       +<--------------------->++-----------------------+
|   (Vite + PWA)    |                        |   Express.js API      |
|                   |                        |   (Node.js 20+)       |
+---+-------+-------+                        |                       |
    |       |                                |  +------------------+ |
    |       |                                |  | Auth Middleware   | |      +------------------+
    |       |                                |  +------------------+ |      |  Neon PostgreSQL  |
    |       |                                |  | Routes (v1)      | +----->|  (Cloud DB)       |
    |       |                                |  +------------------+ |      +------------------+
    |       |                                |  | Services         | |
    |       |                                |  |  - Email         +------> Resend (Email API)
    |       |                                |  |  - SMS           +------> Twilio Verify
    |       |                                |  |  - Payments      +------> Razorpay
    |       |                                |  |  - AI Triage     +------> Groq (LLM API)
    |       |                                |  |  - Push          +------> Web Push (VAPID)
    |       |                                |  |  - Upload        +------> Cloudinary
    |       |                                |  +------------------+ |
    |       |                                +-----------------------+
    |       |
    |       +-----------> Mapbox GL (Maps SDK - client-side)
    |
    +-------------------> Service Worker (Workbox - offline + push)
```

---

## 4. Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | React | 19.2.0 |
| **Build Tool** | Vite | 7.3.1 |
| **Routing** | React Router | 7.13.0 |
| **Backend Runtime** | Node.js | 20+ (ESM) |
| **Backend Framework** | Express.js | 4.22.1 |
| **Database** | PostgreSQL (Neon) | 15+ |
| **DB Driver** | node-postgres (pg) | 8.11.3 |
| **Auth** | JWT (jsonwebtoken) | 9.0.2 |
| **Password Hashing** | bcryptjs | 2.4.3 |
| **Email** | Resend | 4.8.0 |
| **SMS** | Twilio | 5.13.1 |
| **Payments** | Razorpay | 2.9.6 |
| **Image Upload** | Cloudinary + Multer | 2.9.0 / 1.4.5 |
| **Maps** | Mapbox GL | 3.18.1 |
| **AI/LLM** | Groq API | OpenAI-compatible |
| **Push Notifications** | web-push | 3.6.7 |
| **PWA** | vite-plugin-pwa + Workbox | 1.2.0 / 7.4.0 |
| **Phone Validation** | libphonenumber-js | 1.12.41 |

---

## 5. Backend Architecture

### Directory Structure

```
backend/
├── index.js              # Server entry point, middleware setup, route mounting
├── config.js             # Centralized env-based configuration
├── db.js                 # PostgreSQL connection pool (pg.Pool)
├── controllers/          # Request handlers (thin layer)
├── middleware/
│   └── auth.js           # JWT verification + role-based access control
├── providers/
│   └── resend-email.provider.js  # Lazy Resend client singleton
├── routes/
│   ├── auth.js           # Registration, login, password reset
│   ├── mechanics.js      # Mechanic profiles, nearby search, analytics
│   ├── services.js       # Service categories
│   ├── bookings.js       # Booking CRUD, status transitions, chat
│   ├── users.js          # User locations
│   ├── upload.js         # Image upload (Cloudinary)
│   ├── reviews.js        # Review CRUD
│   ├── push.js           # Push subscription management
│   ├── email.routes.js   # Email sending endpoint
│   ├── ai.js             # AI triage
│   ├── payments.js       # Razorpay order/verification
│   └── admin.js          # Admin management
├── services/
│   ├── email.service.js          # Transactional emails (OTP, reset, invoice)
│   ├── signup-otp.service.js     # OTP generation, verification, signup flow
│   ├── password-reset.service.js # Magic link token generation & validation
│   ├── twilio-verify.service.js  # SMS OTP via Twilio Verify API
│   ├── cloudinary.service.js     # Image buffer upload to Cloudinary
│   ├── razorpay.service.js       # Payment order creation & signature verification
│   ├── ai-triage.service.js      # LLM-based problem triage via Groq
│   ├── push.js                   # Web Push notification delivery
│   ├── phone.util.js             # Phone number normalization (E.164)
│   ├── image-url.util.js         # Cloudinary URL helpers
│   └── users-schema.util.js      # DB schema compatibility helpers
├── scripts/              # Database setup & migration scripts
└── template/             # HTML email templates
```

### Request Flow

```
Client Request
    → Express Middleware (CORS, JSON parsing)
        → Route Handler
            → Auth Middleware (JWT verification, role check)
                → Controller/Route Logic
                    → Service Layer (business logic)
                        → Database (pg pool) / Third-party API
                    ← Response
```

### Connection Pooling

The PostgreSQL connection is managed via `pg.Pool` with the following tuning for Neon's serverless architecture:

- **Max connections:** 10
- **Idle timeout:** 20 seconds (Neon pooler compatibility)
- **Connection timeout:** 10 seconds
- **Keep-alive:** Enabled with 10-second initial delay (prevents Neon idle disconnects)

---

## 6. Frontend Architecture

### Directory Structure

```
frontend/src/
├── main.jsx              # Entry point + PWA service worker registration
├── App.jsx               # React Router configuration + layout
├── api.js                # Centralized API client (fetch-based)
├── apiConfig.js          # API base URL resolution
├── sw.js                 # Service Worker (Workbox precaching + push)
├── context/
│   ├── AuthContext.jsx    # User auth state, JWT token management
│   ├── LocationContext.jsx# Geolocation state (localStorage-backed)
│   └── ThemeContext.jsx   # Light/dark mode toggle
├── hooks/
│   ├── useAuth.js         # AuthContext consumer hook
│   ├── useLocation.js     # LocationContext consumer hook
│   ├── useMediaQuery.js   # Responsive breakpoint detection
│   ├── usePushSubscription.js # Web Push subscription lifecycle
│   └── useBookingsPolling.js  # Polling for booking updates
├── pages/
│   ├── Login.jsx / Register.jsx / ForgotPassword.jsx / ResetPassword.jsx
│   ├── UserDashboard.jsx / UserBookingDetail.jsx
│   ├── MechanicDashboard.jsx / MechanicJobDetail.jsx
│   ├── AdminDashboard.jsx
│   └── LocationGate.jsx   # Geolocation permission gate
├── components/            # Reusable UI components
│   ├── MapLocationPicker.jsx    # Mapbox-powered location selection
│   ├── BookingChat.jsx          # Per-booking chat interface
│   ├── NotificationPrompt.jsx   # Push notification opt-in
│   ├── ProfilePhotoField.jsx    # Avatar upload widget
│   ├── HeaderProfileAvatar.jsx  # Profile menu in header
│   ├── ThemeToggle.jsx          # Dark mode switch
│   └── BookingsPaginationBar.jsx
└── utils/
    ├── phoneValidation.js       # Client-side phone validation
    ├── bookingStatus.js         # Status labels & display helpers
    ├── mapbox.js                # Mapbox API utilities
    └── mapsLinks.js             # Google Maps / Apple Maps deep links
```

### State Management

The frontend uses **React Context API** for global state (no Redux/Zustand needed at current scale):

| Context | Purpose | Persistence |
|---------|---------|-------------|
| `AuthContext` | User profile, JWT token, login/logout | `localStorage` (token) |
| `LocationContext` | User's lat/lng coordinates | `localStorage` |
| `ThemeContext` | Light/dark mode preference | `localStorage` |

### Routing Strategy

React Router v7 with role-based private routes:

```
/login, /register, /forgot-password, /reset-password   → Public
/user/*                                                  → Requires role: user
/mechanic/*                                              → Requires role: mechanic
/admin                                                   → Requires role: admin
/                                                        → Redirects to role-appropriate dashboard
```

The `PrivateRoute` component checks authentication state and role, redirecting unauthorized users to the appropriate page.

---

## 7. Database Design

### Entity-Relationship Overview

```
users (1) ──── (0..1) mechanics
  │                      │
  │ (1)                  │ (1)
  ├──── (*) bookings ────┘
  │         │
  │         ├──── (0..1) reviews
  │         └──── (*) booking_messages
  │
  ├──── (*) user_locations
  ├──── (*) push_subscriptions
  └──── (*) password_reset_tokens

service_categories (1) ──── (*) mechanic_services ──── (1) mechanics
service_categories (1) ──── (*) bookings

signup_verifications (temporary, deleted after successful signup)
```

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | All registered accounts | id, email, phone, password_hash, role (user/mechanic/admin), profile_photo |
| `mechanics` | Mechanic-specific profile data | user_id (FK), latitude, longitude, specialization, hourly_rate, is_available, rating |
| `service_categories` | Catalog of services offered | name, type (emergency/scheduled), base_price |
| `mechanic_services` | Junction: which mechanics offer which services | mechanic_id, category_id, price |
| `bookings` | Service requests | user_id, mechanic_id, category_id, status, vehicle details, pricing, payment_status |
| `booking_messages` | Per-booking chat | booking_id, sender_id, message |
| `reviews` | Post-completion ratings | booking_id (unique), rating (1-5), comment |
| `user_locations` | Saved addresses | user_id, latitude, longitude, address, is_default |
| `push_subscriptions` | Browser push endpoints | user_id, endpoint, p256dh, auth |
| `signup_verifications` | Temporary OTP records | email (PK), otp_hash, expires_at, attempts |
| `password_reset_tokens` | One-time reset tokens | user_id, token_hash, expires_at |

### Booking Status State Machine

```
pending ──→ accepted ──→ in_progress ──→ completed
   │            │              │
   ├──→ cancelled (by user)   │
   │            │              │
   └──→ rejected (by mechanic)│
                               └──→ cancelled
```

### Geospatial Query Strategy

Location-based queries use a custom **Haversine distance function** (`distance_km`) implemented as a PostgreSQL function. Nearby mechanic discovery filters mechanics within a 10km radius:

```sql
SELECT * FROM mechanics
WHERE is_available = true
  AND distance_km(latitude, longitude, $1, $2) <= 10
ORDER BY distance_km(latitude, longitude, $1, $2);
```

**Why not PostGIS?** The Haversine function is sufficient for point-to-point distance at the current scale. PostGIS would add deployment complexity on Neon for a relatively simple use case. If the app needs complex geospatial queries (polygons, routes, geofencing), PostGIS would be the upgrade path.

---

## 8. Authentication & Authorization

### Authentication Flow

```
              ┌─────── SIGNUP (2-step) ───────┐
              │                                │
  POST /register/start                 POST /register/verify
  ├── Validate email + phone           ├── Verify email OTP (bcrypt)
  ├── Generate 6-digit OTP             ├── Verify phone OTP (Twilio)
  ├── Hash OTP (bcrypt)                ├── Create user record
  ├── Store in signup_verifications    ├── Delete verification record
  ├── Send email OTP (Resend)          └── Return JWT
  └── Send SMS OTP (Twilio Verify)

              ┌─────── LOGIN ─────────────────┐
              │                                │
  POST /login                          Response
  ├── Find user by email or phone      └── Return JWT (7 day expiry)
  └── Verify password (bcrypt)

              ┌─────── PASSWORD RESET ────────┐
              │                                │
  POST /forgot-password                POST /reset-password
  ├── Generate random token            ├── Hash provided token
  ├── Hash token (SHA-256)             ├── Match against DB
  ├── Store in password_reset_tokens   ├── Check TTL (60 min)
  ├── Email magic link                 ├── Update password
  └── Return generic message           └── Delete token, return JWT
      (no email enumeration)
```

### JWT Structure

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "user | mechanic | admin",
  "iat": 1712345678,
  "exp": 1712950478
}
```

- **Algorithm:** HS256
- **Expiry:** 7 days
- **Storage:** `localStorage` on client
- **Transport:** `Authorization: Bearer <token>` header

### Authorization Model

Role-based access control enforced via `requireRole(...roles)` middleware:

| Endpoint Group | Allowed Roles |
|---------------|---------------|
| Booking creation | user |
| Job claiming, status updates | mechanic |
| Nearby jobs (available) | mechanic |
| Mechanic analytics | mechanic |
| Admin dashboard & management | admin |
| Upload, reviews, chat | any authenticated user |
| Service categories, mechanic profiles | public (no auth) |

---

## 9. Services & Third-Party Integrations

### 9.1 Database - Neon PostgreSQL

| Aspect | Detail |
|--------|--------|
| **Service** | [Neon](https://neon.tech) - Serverless PostgreSQL |
| **Purpose** | Primary data store for all application data |
| **Connection** | `pg.Pool` with connection string (`DATABASE_URL`) |
| **Config** | `DATABASE_URL=postgresql://user:pass@host/db?sslmode=require` |

**Why Neon PostgreSQL?**

| Criteria | Neon | Supabase (PostgreSQL) | PlanetScale (MySQL) | MongoDB Atlas |
|----------|------|----------------------|---------------------|--------------|
| **Serverless scaling** | Native serverless, scales to zero | Always-on (free tier has limits) | Serverless MySQL | Always-on |
| **Free tier** | Generous (0.5 GB storage, branching) | 500 MB, limited connections | Limited rows | 512 MB |
| **PostgreSQL native** | Full PostgreSQL | Full PostgreSQL | MySQL (Vitess) | NoSQL (document) |
| **Branching** | Git-like DB branches for dev/preview | Not available | Not available | Not available |
| **Cold start** | Sub-second | N/A (always on) | Sub-second | N/A |
| **Cost at scale** | Usage-based | Fixed tiers | Usage-based | Usage-based |
| **Connection pooling** | Built-in (pgbouncer) | Built-in (pgbouncer) | Built-in | Connection string |

**Why we chose Neon:**
- **Serverless scale-to-zero** keeps costs at $0 during development and low-traffic periods
- **Native PostgreSQL** compatibility - no ORM lock-in, standard SQL, full feature set
- **Database branching** enables safe schema changes and preview environments
- **Built-in connection pooling** handles the connection limits that serverless functions face
- **Sub-second cold starts** mean no noticeable latency even after idle periods

---

### 9.2 Image Storage - Cloudinary

| Aspect | Detail |
|--------|--------|
| **Service** | [Cloudinary](https://cloudinary.com) |
| **Purpose** | Vehicle photo and profile photo upload, storage, and CDN delivery |
| **Integration** | `cloudinary` npm package v2, buffer upload via stream |
| **Folders** | `mobile_mechanic/vehicles`, `mobile_mechanic/profiles` |
| **Upload Limit** | 5 MB per file (enforced by Multer middleware) |

**Why Cloudinary?**

| Criteria | Cloudinary | AWS S3 + CloudFront | Firebase Storage | Uploadcare |
|----------|-----------|---------------------|-----------------|------------|
| **Built-in transforms** | Resize, crop, format on the fly via URL | Requires Lambda@Edge or separate service | Manual via Cloud Functions | Built-in |
| **CDN included** | Yes (global CDN) | CloudFront required (extra config) | Firebase CDN | Yes |
| **Free tier** | 25 credits/month (~25 GB bandwidth + transforms) | 5 GB storage, 15 GB transfer | 5 GB storage, 1 GB/day transfer | 3,000 uploads/month |
| **Setup complexity** | 3 env vars, one function call | IAM policies, bucket config, CloudFront setup | Firebase project + SDK init | API key + widget |
| **Image optimization** | Automatic (WebP, AVIF, quality) | Manual configuration | Basic | Automatic |
| **SDK quality** | Excellent Node.js SDK | AWS SDK (verbose) | Firebase Admin SDK | Good SDK |

**Why we chose Cloudinary:**
- **Zero infrastructure** - no S3 buckets, CloudFront distributions, or IAM policies to manage
- **On-the-fly image transformations** via URL parameters (resize, crop, format conversion) eliminate the need for a separate image processing pipeline
- **Automatic optimization** delivers WebP/AVIF to supported browsers without code changes
- **Generous free tier** (25 credits/month) is sufficient for development and early production
- **Simple integration** - three env vars and a single upload function vs. multi-service AWS setup

---

### 9.3 Email - Resend

| Aspect | Detail |
|--------|--------|
| **Service** | [Resend](https://resend.com) |
| **Purpose** | Transactional emails: signup OTP, password reset magic links, booking invoices |
| **Integration** | `resend` npm package, HTTP API |
| **Config** | `RESEND_API_KEY`, `SMTP_FROM` |

**Why Resend?**

| Criteria | Resend | SendGrid | AWS SES | Mailgun | Postmark |
|----------|--------|----------|---------|---------|----------|
| **API simplicity** | 1 API call, modern SDK | Complex SDK, webhook setup | Low-level API, IAM config | REST API, webhooks | REST API |
| **Free tier** | 3,000 emails/month | 100 emails/day | 62,000/month (12 months) | 5,000 emails (first month) | 100 emails/month |
| **Deliverability** | High (shared IP reputation) | High (dedicated IP available) | Requires warming | High | Very high |
| **Setup time** | Minutes (API key + verified domain) | Moderate (sender auth, API keys) | Complex (SES sandbox, IAM, DNS) | Moderate | Moderate |
| **Developer experience** | Modern, TypeScript-first SDK | Legacy SDK, verbose | AWS SDK complexity | Good SDK | Good SDK |
| **React Email support** | Native (same team) | No | No | No | No |

**Why we chose Resend:**
- **Developer experience** - modern API with a clean, TypeScript-first SDK; a single function call sends an email
- **Generous free tier** (3,000 emails/month) covers development and early-stage production
- **Fast setup** - API key + verified sender, no sandbox mode or warming period required
- **High deliverability** out of the box without dedicated IP management
- **Built by the React Email team** - seamless integration path if we upgrade to React Email templates

---

### 9.4 SMS/OTP - Twilio Verify

| Aspect | Detail |
|--------|--------|
| **Service** | [Twilio Verify](https://www.twilio.com/verify) |
| **Purpose** | Phone number verification via SMS OTP during registration |
| **Integration** | `twilio` npm package, Verify Service API |
| **Config** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` |
| **Dev mode** | `PHONE_VERIFY_SKIP=true` accepts any 4-8 digit code |

**Why Twilio Verify?**

| Criteria | Twilio Verify | Firebase Auth (Phone) | AWS SNS | MSG91 | Vonage Verify |
|----------|--------------|----------------------|---------|-------|---------------|
| **OTP management** | Fully managed (generation, delivery, verification) | Fully managed | DIY (SNS sends, you manage OTPs) | Managed | Managed |
| **Global reach** | 200+ countries | 200+ countries | 200+ countries | India-focused | 200+ countries |
| **Fraud protection** | Built-in (rate limiting, geo permissions) | reCAPTCHA | Manual | Basic | Built-in |
| **Pricing** | $0.05/verification | Free (within Firebase limits) | $0.00645/SMS (India) | INR 0.20/SMS | $0.05/verification |
| **Reliability** | Industry-leading | Google infrastructure | AWS infrastructure | Good in India | Good |
| **Vendor lock-in** | Moderate (Verify API is Twilio-specific) | High (Firebase SDK) | Low (standard SMS) | Low | Moderate |

**Why we chose Twilio Verify:**
- **Fully managed OTP lifecycle** - Twilio handles code generation, delivery, expiry, and verification; we only make two API calls (`send` and `check`)
- **Built-in fraud protection** eliminates the need for custom rate-limiting and geo-blocking
- **Industry-leading reliability** with 200+ country coverage, important for a service that may expand geographically
- **Clean separation** - Verify is a purpose-built service for phone verification, not a general-purpose SMS gateway
- **Dev mode support** via `PHONE_VERIFY_SKIP` flag enables testing without consuming SMS credits

---

### 9.5 Payments - Razorpay

| Aspect | Detail |
|--------|--------|
| **Service** | [Razorpay](https://razorpay.com) |
| **Purpose** | Online payment processing (INR) + COD confirmation workflow |
| **Integration** | `razorpay` npm package, Orders API + signature verification |
| **Config** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| **Payment Methods** | Online (Razorpay checkout) or Cash on Delivery (mechanic confirms) |

**Why Razorpay?**

| Criteria | Razorpay | Stripe | PayU | Cashfree | Paytm PG |
|----------|----------|--------|------|----------|----------|
| **INR support** | Native (India-first) | Supported but US-first | Native India | Native India | Native India |
| **UPI support** | Full (UPI, UPI Intent, QR) | Limited UPI | Full UPI | Full UPI | Full UPI |
| **Payment methods** | Cards, UPI, Wallets, NetBanking, EMI | Cards, UPI (limited) | Cards, UPI, Wallets | Cards, UPI, Wallets | Cards, UPI, Paytm Wallet |
| **Pricing** | 2% per transaction | 2% + currency conversion | 2% | 1.95% | 1.99% |
| **Developer experience** | Excellent (modern SDK, dashboard) | Best globally (not India-focused) | Moderate | Good | Moderate |
| **Test mode** | Full sandbox with test credentials | Full sandbox | Sandbox | Sandbox | Sandbox |
| **Settlement** | T+2 business days | T+2 (India) | T+2 | T+1-T+3 | T+1-T+3 |

**Why we chose Razorpay:**
- **India-first** - purpose-built for the Indian market with native UPI, wallets (PhonePe, Google Pay, Paytm), net banking, and EMI support
- **Full UPI coverage** including UPI Intent (deep-linking into payment apps), which is the dominant payment method in India
- **Excellent developer experience** with clear documentation, modern SDKs, and a well-designed test/sandbox mode
- **Simple integration flow**: create order (server-side) -> collect payment (client-side checkout) -> verify signature (server-side)
- **COD support** was built as a custom workflow alongside Razorpay, since mechanic services often require cash payment flexibility
- Stripe was not chosen because its India UPI/wallet support is secondary, and its pricing includes currency conversion overhead

---

### 9.6 AI Triage - Groq

| Aspect | Detail |
|--------|--------|
| **Service** | [Groq](https://groq.com) |
| **Purpose** | AI-powered problem triage - suggests service category, urgency, and safety tips based on user's problem description |
| **Integration** | OpenAI-compatible REST API (`/openai/v1/chat/completions`) |
| **Model** | Configurable; default `llama-3.1-8b-instant` |
| **Config** | `GROQ_API_KEY`, `GROQ_MODEL` |

**Why Groq?**

| Criteria | Groq | OpenAI API | Anthropic Claude | Google Gemini | Local LLM (Ollama) |
|----------|------|-----------|-----------------|---------------|-------------------|
| **Inference speed** | Ultra-fast (LPU hardware, ~500 tok/s) | Fast (GPT-4o ~100 tok/s) | Fast (~100 tok/s) | Fast | Slow (depends on hardware) |
| **Cost** | Free tier + very low cost | $2.50-15/M tokens | $3-15/M tokens | Free tier available | Free (hardware cost) |
| **API compatibility** | OpenAI-compatible | Native | Native | Native | OpenAI-compatible |
| **Open models** | Llama, Mixtral, Gemma (open-source) | Proprietary (GPT-4, GPT-4o) | Proprietary (Claude) | Proprietary (Gemini) | Any open model |
| **Latency** | Lowest in industry | Low | Low | Low | High |
| **Privacy** | API-based | API-based | API-based | API-based | Fully local |

**Why we chose Groq:**
- **Ultra-low latency** - Groq's custom LPU hardware delivers the fastest inference in the industry, critical for real-time triage where users are waiting for a suggestion
- **OpenAI-compatible API** means zero vendor lock-in; switching to OpenAI, Together AI, or any OpenAI-compatible endpoint requires only changing the base URL and API key
- **Open-source models** (Llama 3.1) avoid proprietary model dependency and reduce cost
- **Generous free tier** is sufficient for development and early production
- **Cost efficiency** - for a structured JSON output task (triage), a fast 8B model is both cheaper and faster than GPT-4 with no quality penalty for this specific use case

---

### 9.7 Maps - Mapbox GL

| Aspect | Detail |
|--------|--------|
| **Service** | [Mapbox GL JS](https://www.mapbox.com/mapbox-gljs) |
| **Purpose** | Interactive map rendering, location picker, geocoding |
| **Integration** | `mapbox-gl` npm package (client-side) |
| **Config** | `VITE_MAPBOX_ACCESS_TOKEN` |

**Why Mapbox GL?**

| Criteria | Mapbox GL | Google Maps | Leaflet + OSM | Apple Maps (MapKit JS) |
|----------|-----------|------------|---------------|----------------------|
| **Rendering** | WebGL (vector tiles, smooth) | Raster + vector hybrid | Raster (default) | WebGL (vector) |
| **Customization** | Full style control (Mapbox Studio) | Limited (styled maps) | CSS + tile layers | Limited styles |
| **Free tier** | 50,000 map loads/month | $200 credit/month (~28,000 loads) | Completely free | 250,000 initializations/day |
| **Geocoding** | Included (Mapbox Geocoding API) | Places API (extra cost) | Nominatim (separate) | Included |
| **Offline** | Vector tile caching | Limited | Tile download | No offline |
| **Bundle size** | ~200 KB (GL) | ~200 KB | ~40 KB (no WebGL) | ~100 KB |
| **Performance** | Excellent (vector tiles) | Good | Good (raster) | Excellent |
| **Pricing transparency** | Clear per-load pricing | Complex (per-session + API calls) | Free | Free (with Apple limits) |

**Why we chose Mapbox GL:**
- **WebGL vector tile rendering** provides smooth, interactive maps with excellent performance on mobile browsers
- **Generous free tier** (50,000 map loads/month) vs. Google Maps' complex pricing
- **Full style customization** via Mapbox Studio enables branded map appearance
- **Integrated geocoding** - one provider for both map display and address lookup, no separate API needed
- **Transparent pricing** - simple per-load cost model vs. Google Maps' session-based pricing with multiple API cost layers
- Google Maps was not chosen due to its complex pricing model and the fact that Mapbox provides equivalent functionality at a lower cost for our usage pattern

---

### 9.8 Push Notifications - Web Push (VAPID)

| Aspect | Detail |
|--------|--------|
| **Technology** | [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) with VAPID authentication |
| **Purpose** | Real-time browser notifications for booking events (new job, status updates) |
| **Integration** | `web-push` npm package (server), `PushManager` API (client), Service Worker |
| **Config** | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |

**Why Web Push (VAPID)?**

| Criteria | Web Push (VAPID) | Firebase Cloud Messaging (FCM) | OneSignal | Pusher |
|----------|-----------------|-------------------------------|-----------|--------|
| **Cost** | Free (open standard) | Free | Free tier + paid | Paid |
| **Vendor lock-in** | None (W3C standard) | Google ecosystem | OneSignal platform | Pusher platform |
| **Setup complexity** | VAPID key pair + Service Worker | Firebase project + SDK + FCM config | Dashboard + SDK | Dashboard + SDK |
| **Browser support** | Chrome, Firefox, Edge, Safari 16+ | Chrome, Firefox (wraps Web Push) | All major (wraps FCM/APNs) | All (WebSocket fallback) |
| **Self-hosted** | Yes (your server sends directly) | No (Google relay) | No | No |
| **Privacy** | Direct server-to-browser | Google intermediary | Third-party relay | Third-party relay |

**Why we chose Web Push (VAPID):**
- **Zero cost** - Web Push is an open W3C standard with no per-message charges or usage limits
- **No vendor lock-in** - VAPID is a standard protocol; switching push infrastructure doesn't require client-side changes
- **Direct delivery** - push messages go from our server directly to the browser push service (no third-party relay), which is better for privacy
- **Simple implementation** - the `web-push` library handles all the encryption and VAPID signing; our code just calls `sendToUser(userId, payload)`
- **PWA native** - Web Push is the standard push mechanism for PWAs, aligning with our PWA strategy
- FCM was not chosen because it adds a Google dependency for a feature that works fine with the open standard

---

### 9.9 PWA - Workbox (via vite-plugin-pwa)

| Aspect | Detail |
|--------|--------|
| **Technology** | [Workbox](https://developer.chrome.com/docs/workbox) via `vite-plugin-pwa` |
| **Purpose** | Offline app shell caching, install-to-home-screen, push notification handling |
| **Strategy** | `injectManifest` - custom service worker with Workbox precaching |
| **Config** | `vite.config.js` PWA plugin configuration |

**Why Workbox + vite-plugin-pwa?**

| Criteria | Workbox + vite-plugin-pwa | Manual Service Worker | next-pwa | @pwa/cli |
|----------|--------------------------|----------------------|----------|----------|
| **Build integration** | Automatic manifest generation from Vite build | Manual cache list management | Next.js-specific | Framework-agnostic |
| **Caching strategies** | Pre-built (CacheFirst, StaleWhileRevalidate, etc.) | DIY | Workbox-based | Workbox-based |
| **Maintenance** | Auto-updates cache manifest on each build | Manual version bumping | Auto | Auto |
| **Flexibility** | `injectManifest` allows custom SW logic | Full control | Limited customization | Good |
| **Vite integration** | Native plugin | Manual Vite config | N/A (Next.js only) | Separate build step |

**Why we chose Workbox + vite-plugin-pwa:**
- **Seamless Vite integration** - the plugin automatically generates the precache manifest from Vite's build output, ensuring the service worker always caches the correct asset hashes
- **`injectManifest` strategy** gives us full control over the service worker (for push notification handling) while still getting automatic precache management
- **Battle-tested caching strategies** (Workbox modules) eliminate the error-prone task of writing manual cache logic
- **Auto-update** - the precache manifest updates automatically on each build, preventing stale asset issues

---

## 10. API Design

### API Convention

- **Base path:** `/api`
- **Versioning:** Currently unversioned (route files in `routes/v1/` but mounted directly on `/api`)
- **Format:** JSON request/response
- **Authentication:** Bearer token in `Authorization` header
- **Error format:** `{ error: "message" }` with appropriate HTTP status codes

### Resource Endpoints

| Resource | Endpoints | Auth Required |
|----------|----------|---------------|
| Auth | 8 endpoints (register, login, reset, profile) | Partial |
| Mechanics | 5 endpoints (nearby, profile, analytics) | Partial |
| Services | 1 endpoint (categories) | No |
| Bookings | 10 endpoints (CRUD, status, claim, chat) | Yes |
| Users | 2 endpoints (save/list locations) | Yes |
| Upload | 2 endpoints (vehicle image, profile photo) | Yes |
| Reviews | 3 endpoints (submit, by mechanic, by booking) | Partial |
| Push | 3 endpoints (VAPID key, subscribe, unsubscribe) | Partial |
| AI | 2 endpoints (capabilities, triage) | Partial |
| Payments | 3 endpoints (config, create order, verify) | Partial |
| Admin | 5 endpoints (users, mechanics, bookings, stats) | Yes (admin) |
| Health | 1 endpoint (liveness check) | No |

---

## 11. Core Feature Flows

### Booking Lifecycle

```
Customer                           System                          Mechanic
   │                                 │                                │
   ├─ Find nearby mechanics ────────>│                                │
   │<──────── Mechanics list ────────┤                                │
   │                                 │                                │
   ├─ Create booking ───────────────>│                                │
   │                                 ├── Push notify nearby ─────────>│
   │<──────── Booking created ───────┤                                │
   │                                 │                                │
   │                                 │<──── Claim booking ────────────┤
   │<──── Push: mechanic assigned ───┤──── Booking accepted ─────────>│
   │                                 │                                │
   │         ┌── Chat messages ──────┤<──── Chat messages ────────────┤
   │<────────┘                       │                                │
   │                                 │                                │
   │                                 │<──── Status: in_progress ──────┤
   │<──── Push: work started ────────┤                                │
   │                                 │                                │
   │── Pay online (Razorpay) ───────>│                                │
   │<──── Payment confirmed ─────────┤   OR                           │
   │                                 │<──── Confirm COD payment ──────┤
   │                                 │                                │
   │                                 │<──── Status: completed ────────┤
   │<──── Push: job completed ───────┤──── Invoice email ────────────>│
   │                                 │                                │
   ├─ Submit review ────────────────>│                                │
   │                                 ├── Update mechanic rating ──────┤
```

### AI Triage Flow

```
Customer                           System                          Groq API
   │                                 │                                │
   ├─ Describe problem ────────────>│                                │
   │                                 ├── Load service categories ────>│ (DB)
   │                                 ├── Build prompt + categories ──>│
   │                                 │<──── JSON response ────────────┤
   │<──── Suggested category, ───────┤                                │
   │      urgency, safety tips       │                                │
   │                                 │                                │
   ├─ Accept suggestion ───────────>│                                │
   │  (pre-fills booking form)       │                                │
```

---

## 12. Security Architecture

### Authentication Security

| Measure | Implementation |
|---------|---------------|
| Password hashing | bcrypt with salt rounds |
| OTP hashing | bcrypt (signup OTPs stored hashed) |
| Reset tokens | SHA-256 hashed before storage |
| JWT secret | Environment variable, not hardcoded |
| Token expiry | 7 days (JWT), 10 min (OTP), 60 min (reset token) |
| Brute-force protection | OTP max attempts (5), resend cooldown (60s) |
| Email enumeration prevention | Generic responses on forgot-password |

### Data Security

| Measure | Implementation |
|---------|---------------|
| HTTPS | Enforced in production (Neon requires SSL) |
| CORS | Origin-aware (configurable) |
| Input validation | Phone normalization (libphonenumber), role checks |
| File upload limits | 5 MB max (Multer), image type validation |
| SQL injection prevention | Parameterized queries via `pg` (no raw string interpolation) |
| Payment verification | Razorpay HMAC SHA-256 signature verification |
| Role-based access | Middleware-enforced at route level |

---

## 13. Deployment Architecture

### Current Setup

```
Frontend (React SPA)          Backend (Express API)           Database
┌──────────────────┐         ┌──────────────────┐         ┌──────────────┐
│  Vite build       │         │  Node.js 20+     │         │  Neon         │
│  → static files   │ ──────> │  Express server   │ ──────> │  PostgreSQL   │
│  (dist/)          │  /api   │  Port 3001        │  SSL    │  (Serverless) │
└──────────────────┘         └──────────────────┘         └──────────────┘
                                      │
                              Third-party APIs
                              (Cloudinary, Resend,
                               Twilio, Razorpay,
                               Groq, Web Push)
```

### Environment Configuration

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| **Development** | `vite dev` (HMR, port 5173) | `node index.js` (port 3001) | Neon dev branch |
| **Production** | `vite build` → static hosting | Node.js process | Neon main branch |

---

## 14. Scalability Considerations

### Current Limitations & Upgrade Paths

| Area | Current Approach | Scaling Concern | Upgrade Path |
|------|-----------------|----------------|--------------|
| **Real-time chat** | Polling (`useBookingsPolling`) | Frequent HTTP requests | WebSocket (Socket.io) or Server-Sent Events |
| **Geospatial queries** | Haversine SQL function | Full table scan for distance | PostGIS extension with spatial indexes |
| **Push notifications** | Sequential delivery | Slow for many recipients | Message queue (BullMQ/Redis) for async delivery |
| **File uploads** | Synchronous Cloudinary upload | Blocks request during upload | Direct-to-Cloudinary upload (signed URLs) |
| **Database connections** | 10-connection pool | Connection exhaustion | Neon pooler (pgbouncer) with higher limits |
| **Rate limiting** | OTP cooldowns only | No API-level rate limiting | Express rate-limit middleware or API gateway |
| **Caching** | None | Repeated DB queries | Redis cache for hot data (categories, mechanic profiles) |
| **Search** | SQL LIKE/distance queries | Slow at scale | Elasticsearch for full-text + geo search |
| **Background jobs** | Inline (email, push in request cycle) | Slow responses | Job queue (BullMQ) for async processing |
| **Monitoring** | Health endpoint only | No visibility into errors/perf | APM (Sentry, Datadog), structured logging |

---

*This document reflects the architecture as of April 2026. It should be updated as the system evolves.*
