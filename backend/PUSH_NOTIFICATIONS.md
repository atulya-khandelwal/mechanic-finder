# Web push notifications (VAPID)

The app uses the **Web Push API** with **VAPID** keys so the backend can send notifications to browsers that have subscribed.

## 1. Apply the database migration

Subscriptions are stored in `push_subscriptions`.

**Recommended (uses `DATABASE_URL` from `backend/.env` — no need to export it in the terminal):**

```bash
cd backend
npm run db:migrate-push
```

**Why `psql "$DATABASE_URL"` failed:** If `DATABASE_URL` is not set in your shell, the variable is empty and PostgreSQL connects to a default database named after your OS user (e.g. `bigstep`), which usually does not exist.

**Manual `psql` alternatives** (from repo root, with a real URL):

```bash
set -a && source backend/.env && set +a
psql "$DATABASE_URL" -f database/migration-push.sql
```

Or:

```bash
psql "postgresql://postgres:password@localhost:5432/mobile_mechanic" -f database/migration-push.sql
```

## 2. Generate a VAPID key pair

From the **backend** directory:

```bash
npm run generate-vapid
```

Copy the printed `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` into **`backend/.env`** (never commit real keys).

- **Keep the private key secret** — only the Node server should have it.
- You can generate new keys anytime; existing browser subscriptions will stop working until users enable notifications again.

## 3. Restart the API

Restart `npm run dev` or your process manager so `dotenv` loads the new variables.

## 4. Frontend

You do **not** need a VAPID variable in the frontend `.env`. The app loads the public key from **`GET /api/push/vapid-public-key`** after the user is logged in.

## 5. Booking-related pushes

| Event | Who gets notified |
|--------|-------------------|
| **Create booking** | Customer: booking submitted. If no mechanic chosen: nearby mechanics (broadcast). If a mechanic is chosen: that mechanic only (no nearby broadcast). |
| **PATCH status → accepted** | Customer and assigned mechanic. |
| **PATCH status → in_progress** | Customer and mechanic. |
| **PATCH status → completed** | Customer and mechanic (includes total). |
| **PATCH status → cancelled** | Customer if a mechanic cancelled; customer and mechanic if an admin cancelled. |
| **PATCH assign** (user picks mechanic) | Customer and assigned mechanic. |
| **POST claim** (mechanic accepts open job) | Customer only (mechanic already acted). |

Payloads use `tag: booking-<id>` and a longer TTL for booking pushes (see `bookingNotifications.js`).

## 6. How to verify

1. Use **HTTPS** or **http://localhost** (push requires a secure context).
2. Log in, open the dashboard, and use **Enable** on the notification banner (grant permission when prompted).
3. Trigger an event that sends push (e.g. create a booking as a user so nearby mechanics get a notification, if they subscribed).

## 7. Troubleshooting

| Symptom | What to check |
|--------|----------------|
| Banner never offers Enable / shows unsupported | `VAPID_PUBLIC_KEY` missing or empty in backend `.env` |
| Subscribe fails or no notifications arrive | `VAPID_PRIVATE_KEY` missing; restart server after setting |
| 500 on `/api/push/subscribe` | DB migration not applied or DB error |
| Works on Chrome desktop but not iOS | iOS Web Push support is limited; test on Android/desktop |

The contact string inside `backend/services/push.js` (`mailto:…` in `setVapidDetails`) can be changed to your support email; it is visible to push services in some cases.
