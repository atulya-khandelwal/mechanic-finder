# CLAUDE.md — Mobile Mechanic (React + Supabase)

## Project name

**Mobile Mechanic** — A web platform connecting customers with nearby mobile mechanics for vehicle repair services. Three roles: Customer, Mechanic, Admin.

---

## Tech stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + Vite 7 | UI framework + build tool |
| Routing | React Router 7 | Client-side routing with role guards |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| Backend | Supabase | Auth, Database, Storage, Realtime, Edge Functions |
| Database | Supabase PostgreSQL | All data, RLS for authorization |
| Auth | Supabase Auth | Email/password, phone OTP, password reset |
| File storage | Supabase Storage | Vehicle photos, profile avatars |
| Realtime | Supabase Realtime | Live chat, booking status updates |
| Server logic | Supabase Edge Functions (Deno) | Payment verification, AI triage |
| Maps | Mapbox GL JS | Mechanic discovery, location picker |
| Payments | Razorpay (INR) | Online payments via Edge Function |
| PWA | vite-plugin-pwa + Workbox | Offline caching, installable app |

**No separate backend server.** Supabase replaces Express entirely. All data access goes through the Supabase JS client with RLS policies enforcing authorization.

---

## Architecture flow

```
Browser (React + Vite)
  │
  ├── supabase.auth.*          → Supabase Auth (signup, login, session, password reset)
  ├── supabase.from('table')   → Supabase PostgreSQL (CRUD with RLS enforcement)
  ├── supabase.rpc('fn')       → PostgreSQL functions (nearby_mechanics, etc.)
  ├── supabase.storage.*       → Supabase Storage (images)
  ├── supabase.channel()       → Supabase Realtime (chat, booking updates)
  └── supabase.functions.invoke() → Edge Functions (Razorpay, AI triage)

Supabase Project
  ├── Auth         — User accounts, sessions, password reset emails
  ├── Database     — PostgreSQL with RLS policies (no middleware needed)
  ├── Storage      — Buckets: vehicle-images, avatars
  ├── Realtime     — Postgres changes broadcast to subscribed clients
  └── Edge Functions (Deno)
      ├── razorpay-create-order
      ├── razorpay-verify-payment
      └── ai-triage (optional)
```

**Request flow**: React component → Supabase JS client → Supabase project → PostgreSQL (RLS checks `auth.uid()` automatically) → response to client. No REST API layer to build or maintain.

**Auth flow**: `supabase.auth.signUp()` / `signInWithPassword()` → Supabase manages JWT internally → `supabase.auth.getSession()` returns current user → RLS policies use `auth.uid()` to scope queries.

---

## Key file paths

```
src/
├── main.jsx                          # Entry point, renders <App />
├── App.jsx                           # Router setup, auth guards, layout
│
├── lib/
│   └── supabase.js                   # Single Supabase client instance (createClient)
│
├── context/
│   ├── AuthContext.jsx                # User session, profile, role, sign in/out
│   ├── LocationContext.jsx            # Browser geolocation, localStorage cache
│   └── ThemeContext.jsx               # Dark/light mode toggle
│
├── pages/
│   ├── Login.jsx                      # Email/phone + password login
│   ├── Register.jsx                   # Signup with role selection
│   ├── ForgotPassword.jsx             # Trigger Supabase password reset email
│   ├── ResetPassword.jsx              # Handle reset callback, set new password
│   ├── UserDashboard.jsx              # Customer: find mechanic, bookings, profile
│   ├── MechanicDashboard.jsx          # Mechanic: jobs, earnings, analytics, profile
│   ├── AdminDashboard.jsx             # Admin: users, mechanics, bookings, stats
│   ├── BookingDetail.jsx              # Status timeline, chat, payment, review
│   └── LocationGate.jsx               # Geolocation permission prompt
│
├── components/
│   ├── BookingChat.jsx                # Realtime chat (Supabase channel subscription)
│   ├── BookingForm.jsx                # Vehicle details, service, payment method
│   ├── MapLocationPicker.jsx          # Mapbox GL map with click-to-select
│   ├── MechanicCard.jsx               # Name, rating, distance, rate
│   ├── ReviewForm.jsx                 # 1-5 stars + comment
│   ├── StatusBadge.jsx                # Booking status pill with color
│   ├── ProfilePhotoUpload.jsx         # Upload to Supabase Storage
│   ├── NotificationPrompt.jsx         # Push notification opt-in
│   └── ThemeToggle.jsx                # Dark/light switch
│
├── hooks/
│   ├── useAuth.js                     # Shortcut: useContext(AuthContext)
│   ├── useLocation.js                 # Shortcut: useContext(LocationContext)
│   ├── useNearbyMechanics.js          # Calls supabase.rpc('nearby_mechanics')
│   ├── useRealtimeBooking.js          # Subscribes to booking row changes
│   └── useRealtimeChat.js             # Subscribes to booking_messages inserts
│
├── utils/
│   ├── phoneValidation.js             # E.164 formatting (libphonenumber-js)
│   ├── bookingStatus.js               # Status labels, colors, transitions
│   ├── mapbox.js                      # Mapbox helpers
│   └── pricing.js                     # total = base + home_fee + service_price
│
└── assets/                            # Static images, icons

supabase/
├── migrations/                        # SQL migration files (schema, RLS, functions)
│   ├── 001_schema.sql                 # Tables, enums, indexes
│   ├── 002_rls_policies.sql           # Row Level Security policies
│   ├── 003_functions.sql              # distance_km, nearby_mechanics, triggers
│   └── 004_seed.sql                   # Admin user + service categories
├── functions/                         # Edge Functions (Deno/TypeScript)
│   ├── razorpay-create-order/
│   ├── razorpay-verify-payment/
│   └── ai-triage/
└── config.toml                        # Supabase project config
```

---

## Coding commands

```bash
# Project setup
npm create vite@latest mobile-mechanic -- --template react
cd mobile-mechanic
npm install
npm install @supabase/supabase-js react-router-dom mapbox-gl libphonenumber-js
npm install -D tailwindcss @tailwindcss/vite

# Development
npm run dev                        # Vite dev server (localhost:5173)
npm run build                      # Production build → dist/
npm run preview                    # Preview production build
npm run lint                       # ESLint check

# Supabase CLI
npx supabase init                  # Initialize supabase/ directory
npx supabase start                 # Start local Supabase (Docker)
npx supabase stop                  # Stop local Supabase
npx supabase db reset              # Drop and recreate local DB from migrations
npx supabase db push               # Push migrations to remote project
npx supabase migration new <name>  # Create a new migration file
npx supabase functions serve       # Run Edge Functions locally
npx supabase functions deploy <name> # Deploy Edge Function to production
npx supabase gen types typescript --local > src/lib/database.types.ts  # Generate types

# Supabase link (one-time, connects CLI to your remote project)
npx supabase link --project-ref <your-project-ref>
```

---

## Coding conventions

### General
- Use functional components with hooks. No class components.
- Tailwind CSS for all styling. No inline styles, no CSS modules, no separate CSS files (except `index.css` for Tailwind directives).
- File names: PascalCase for components/pages (`BookingChat.jsx`), camelCase for hooks/utils (`useAuth.js`, `pricing.js`).
- One component per file. Co-locate component-specific hooks in the same file only if they're small and not reusable.

### Supabase
- Single Supabase client in `src/lib/supabase.js`. Import from there everywhere — never call `createClient` more than once.
- All database queries go through the Supabase JS client (`supabase.from()`, `supabase.rpc()`). Never write raw SQL in frontend code.
- Authorization is handled by RLS policies in the database, not in frontend code. Frontend should not check roles before making queries — RLS returns empty results or errors for unauthorized access.
- Use `supabase.auth.getSession()` and `onAuthStateChange()` in AuthContext. Never store tokens manually.
- Realtime subscriptions: always clean up channels in `useEffect` return. Use `supabase.removeChannel(channel)`.
- Storage uploads: use `supabase.storage.from('bucket').upload()`. Store the public URL in the database, not the path.

### React patterns
- State management: React Context only. No Redux, Zustand, or other state libraries.
- Data fetching: `useEffect` + `useState` for simple cases. Custom hooks (e.g., `useNearbyMechanics`) for reusable queries.
- Loading and error states: every async operation must handle `loading`, `error`, and `data` states. Show skeleton/spinner while loading.
- Forms: controlled components with `useState`. Disable submit button while submitting. Show validation errors inline.

### Database
- All tables must have RLS enabled. No exceptions.
- Use `auth.uid()` in RLS policies to scope access to the current user.
- Parameterized queries only (handled by Supabase client automatically).
- Phone numbers in E.164 format. Validated with `libphonenumber-js` before storing.
- Timestamps: use `TIMESTAMPTZ`, never `TIMESTAMP`.
- UUIDs for all primary keys (`gen_random_uuid()`).
- Currency: INR. Prices as `DECIMAL(10,2)`.

### Edge Functions
- Written in TypeScript (Deno runtime).
- Keep secrets (Razorpay key, Groq key) in Supabase project settings → Edge Function secrets. Never in frontend env vars.
- Validate request body. Return proper HTTP status codes. Always return JSON.

---

## Do not rules

1. **Do NOT create a separate Express/Node backend.** Supabase is the entire backend. If you need server-side logic, use Edge Functions.
2. **Do NOT disable RLS** on any table, even temporarily. If a query returns empty results, fix the RLS policy — don't remove it.
3. **Do NOT store Supabase `service_role` key in frontend code.** Only the `anon` key goes in `VITE_SUPABASE_ANON_KEY`. The service role key is for Edge Functions and server-side only.
4. **Do NOT check user roles in frontend code for security.** Role checks in the UI are for UX (showing/hiding elements), not security. RLS policies are the security layer.
5. **Do NOT use `supabase.auth.admin.*` methods in frontend.** Admin auth methods require the service role key and must only be used in Edge Functions.
6. **Do NOT store JWT tokens manually** (localStorage, cookies). Supabase Auth handles session persistence automatically.
7. **Do NOT use `any` type** when TypeScript types are available. Generate types with `supabase gen types typescript`.
8. **Do NOT write CSS files or inline styles.** Use Tailwind utility classes exclusively.
9. **Do NOT install axios or other HTTP clients.** Use the Supabase JS client for data. Use native `fetch` only inside Edge Functions.
10. **Do NOT skip loading/error states.** Every data fetch must handle all three states (loading, error, success).
11. **Do NOT hardcode Supabase URLs or keys.** Always use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars.
12. **Do NOT create database tables without migration files.** All schema changes go through `supabase/migrations/`. Never modify schema via the dashboard in production.
13. **Do NOT put payment secrets (Razorpay key secret) in frontend env vars.** These go in Supabase Edge Function secrets only.

---

## Repeated mistakes to avoid

### Supabase-specific
- **Forgetting RLS on new tables**: Every `CREATE TABLE` must be followed by `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and at least one policy. Without policies, RLS-enabled tables block all access.
- **Missing `.single()` on unique queries**: When fetching one row (e.g., profile by id), always append `.single()`. Without it, Supabase returns an array.
- **Not handling Supabase errors**: `const { data, error } = await supabase.from(...)`. Always check `error` before using `data`. Supabase does not throw — it returns `{ data: null, error: {...} }`.
- **Realtime channel leaks**: Forgetting to call `supabase.removeChannel(channel)` in the `useEffect` cleanup causes memory leaks and duplicate event handlers.
- **Using `.select('*')` everywhere**: Only select the columns you need. Over-fetching slows down queries and exposes data unnecessarily.
- **Forgetting the profile trigger**: New auth users won't have a `profiles` row unless you create a database trigger on `auth.users` insert. Without this, all RLS policies that reference `profiles` will fail.
- **Edge Function CORS**: Edge Functions need explicit CORS headers. Add `Access-Control-Allow-Origin` and handle OPTIONS preflight requests.

### React-specific
- **Stale closures in Realtime callbacks**: Supabase Realtime callbacks capture state at subscription time. Use functional state updates (`setMessages(prev => [...prev, newMsg])`) instead of reading state directly.
- **Missing dependency arrays**: `useEffect` without deps runs every render. Always specify dependencies. If the effect should run once, use `[]`.
- **Not cleaning up subscriptions**: Auth listener (`onAuthStateChange`) returns a subscription object. Call `subscription.unsubscribe()` in cleanup.
- **Rendering during auth loading**: The app must show a loading state while `supabase.auth.getSession()` resolves. Rendering routes before auth is ready causes flashes of wrong content and unauthorized Supabase calls.

### Tailwind-specific
- **Using `@apply` excessively**: Defeats the purpose of utility-first CSS. Use `@apply` only for truly repeated patterns (e.g., `.btn-primary`). Prefer component extraction instead.
- **Not using `dark:` variant**: If the app supports dark mode, every color class needs a `dark:` counterpart or use CSS variables with Tailwind.
- **Forgetting responsive prefixes**: Always design mobile-first. Use `sm:`, `md:`, `lg:` for larger screens.

### Database-specific
- **Not indexing foreign keys**: Supabase doesn't auto-create indexes on FK columns. Add indexes on `user_id`, `mechanic_id`, `booking_id` in frequently queried tables.
- **Using `TIMESTAMP` instead of `TIMESTAMPTZ`**: Always use `TIMESTAMPTZ` to avoid timezone issues.
- **Forgetting `ON DELETE CASCADE`**: When a user is deleted, their bookings, messages, reviews, etc. should cascade. Missing this causes orphaned rows or FK constraint errors.

---

## Testing strategies

### Unit testing
- **Framework**: Vitest (built into Vite ecosystem)
- **What to test**: Utility functions (`pricing.js`, `phoneValidation.js`, `bookingStatus.js`), pure logic in hooks
- **Setup**: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
- **Config**: Add `test` config to `vite.config.js`:
  ```js
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.js' }
  ```

### Component testing
- **Framework**: Vitest + React Testing Library
- **What to test**: Form validation, conditional rendering, user interactions
- **Mock Supabase**: Create a mock `supabase` client in tests. Never hit the real Supabase project from tests.
  ```js
  vi.mock('../lib/supabase', () => ({
    supabase: { from: vi.fn(), auth: { getSession: vi.fn() }, ... }
  }))
  ```

### Integration testing (Supabase)
- **Use local Supabase** (`npx supabase start`) for integration tests
- **Test RLS policies**: Write SQL tests that verify policies by setting `auth.uid()` via `SET request.jwt.claims`
- **Test Edge Functions**: Use `supabase functions serve` locally and test with `fetch`

### E2E testing (optional)
- **Framework**: Playwright or Cypress
- **What to test**: Full user flows — register → find mechanic → book → chat → pay → review
- **Run against**: Local Supabase + Vite dev server

### Manual testing checklist
- [ ] Register as customer, login, logout
- [ ] Register as mechanic, complete profile
- [ ] Customer: find nearby mechanics (requires geolocation)
- [ ] Customer: create booking with vehicle photo
- [ ] Mechanic: see available jobs, claim one
- [ ] Mechanic: update status (accepted → in_progress → completed)
- [ ] Chat: send messages from both sides, verify realtime
- [ ] Payment: COD flow + Razorpay flow
- [ ] Review: submit after completion, verify mechanic rating updates
- [ ] Admin: view users, mechanics, bookings
- [ ] Dark mode toggle
- [ ] Mobile responsiveness (test at 375px width)

---

## Additional links and notes

### Supabase documentation
- Supabase JS Client: https://supabase.com/docs/reference/javascript
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Storage: https://supabase.com/docs/guides/storage
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Edge Functions: https://supabase.com/docs/guides/functions
- Supabase CLI: https://supabase.com/docs/guides/local-development
- Generate TypeScript types: https://supabase.com/docs/guides/api/rest/generating-types

### Other docs
- React Router 7: https://reactrouter.com
- Tailwind CSS 4: https://tailwindcss.com/docs
- Mapbox GL JS: https://docs.mapbox.com/mapbox-gl-js
- Razorpay Checkout: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard
- Vitest: https://vitest.dev
- libphonenumber-js: https://github.com/catamphetamine/libphonenumber-js
- vite-plugin-pwa: https://vite-pwa-org.netlify.app

### Notes
- **Default region**: India (`IN`). Currency: INR. Phone format: +91.
- **Default admin**: `admin@mobilemechanic.com` / `admin123` (created via seed migration).
- **Mapbox token**: Required for maps. Get free tier at https://account.mapbox.com.
- **Supabase free tier**: Supports 2 projects, 500MB database, 1GB storage, 50k auth users — sufficient for development and small-scale production.
- **Edge Function cold starts**: First invocation after idle takes 1-2 seconds. Subsequent calls are fast. Keep this in mind for payment flows.
- **Supabase Realtime limits**: Free tier supports 200 concurrent connections. Sufficient for most use cases but plan for this at scale.
- **RLS is the security model**: If you're thinking "should I add a check in frontend code?" — the answer is almost always "add an RLS policy instead." Frontend checks are for UX, not security.
