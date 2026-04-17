# Prompt: Build a Mobile Mechanic Platform (React + Supabase)

> Copy everything below this line and paste it to your AI assistant.

---

## Project Overview

Build a full-stack web application called **Mobile Mechanic** that connects customers with nearby mobile mechanics for vehicle repair services. The platform has three user roles: **Customer**, **Mechanic**, and **Admin**. Use **React** for the frontend and **Supabase** (Auth, Database, Storage, Edge Functions, Realtime) as the entire backend — no separate Express server.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 7, Vite |
| Backend/BaaS | Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime) |
| Database | Supabase PostgreSQL with Row Level Security (RLS) |
| Auth | Supabase Auth (email/password + phone OTP) |
| Storage | Supabase Storage (vehicle photos, profile avatars) |
| Realtime | Supabase Realtime (booking status updates, chat) |
| Maps | Mapbox GL JS (mechanic discovery, location picker) |
| Payments | Razorpay (INR, via Supabase Edge Function for server-side verification) |
| Styling | Tailwind CSS |
| PWA | vite-plugin-pwa + Workbox |

---

## Database Schema (Supabase PostgreSQL)

Create these tables with RLS policies. Use Supabase's `auth.uid()` for row-level security.

### Enums

```sql
CREATE TYPE user_role AS ENUM ('user', 'mechanic', 'admin');
CREATE TYPE service_type AS ENUM ('emergency', 'scheduled');
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected');
```

### Tables

**profiles** (extends Supabase auth.users)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  role user_role NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
- RLS: Users can read/update their own profile. Admins can read all. Public can read name + avatar of mechanics.
- Trigger: Auto-create profile row on `auth.users` insert.

**mechanics**
```sql
CREATE TABLE mechanics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  address TEXT,
  specialization VARCHAR(200),
  hourly_rate DECIMAL(10,2),
  is_available BOOLEAN DEFAULT true,
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
- RLS: Mechanics can update their own. Authenticated users can read available mechanics. Admins can read/write all.

**service_categories**
```sql
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type service_type NOT NULL,
  base_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
```
- RLS: Public read. Admin write.

**mechanic_services** (junction)
```sql
CREATE TABLE mechanic_services (
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
  category_id UUID REFERENCES service_categories(id) ON DELETE CASCADE,
  price DECIMAL(10,2),
  PRIMARY KEY (mechanic_id, category_id)
);
```

**bookings**
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  mechanic_id UUID REFERENCES mechanics(id),
  category_id UUID NOT NULL REFERENCES service_categories(id),
  service_type service_type NOT NULL,
  status booking_status DEFAULT 'pending',
  
  -- Location
  user_latitude DECIMAL(10,8) NOT NULL,
  user_longitude DECIMAL(11,8) NOT NULL,
  user_address TEXT,
  service_location VARCHAR(20) DEFAULT 'home', -- 'home' or 'workshop'
  
  -- Vehicle
  vehicle_image TEXT,
  vehicle_number VARCHAR(20),
  vehicle_make VARCHAR(50),
  vehicle_model VARCHAR(50),
  vehicle_year INTEGER,
  
  -- Problem
  description TEXT,
  problem_description TEXT,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  
  -- Pricing
  base_charge DECIMAL(10,2) DEFAULT 0,
  home_service_fee DECIMAL(10,2) DEFAULT 0,
  service_price DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) DEFAULT 0,
  
  -- Payment
  payment_method VARCHAR(10) DEFAULT 'cod', -- 'cod' or 'online'
  payment_status VARCHAR(10) DEFAULT 'unpaid', -- 'unpaid', 'paid', 'failed'
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
- RLS: Users see their own bookings. Mechanics see bookings assigned to them + available pending bookings nearby. Admins see all.

**booking_messages** (chat)
```sql
CREATE TABLE booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
- RLS: Only booking participants (user_id or mechanic's user_id) can read/write.
- Use **Supabase Realtime** subscriptions on this table for live chat.

**reviews**
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
- RLS: User can create for their own completed booking (once). Public read.

**user_locations** (saved addresses)
```sql
CREATE TABLE user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  address TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Database Functions

**Haversine distance function** (for nearby mechanic search):
```sql
CREATE OR REPLACE FUNCTION distance_km(lat1 FLOAT, lon1 FLOAT, lat2 FLOAT, lon2 FLOAT)
RETURNS FLOAT AS $$
  SELECT 6371 * acos(
    cos(radians(lat1)) * cos(radians(lat2)) *
    cos(radians(lon2) - radians(lon1)) +
    sin(radians(lat1)) * sin(radians(lat2))
  )
$$ LANGUAGE sql IMMUTABLE;
```

**Find nearby mechanics** (RPC):
```sql
CREATE OR REPLACE FUNCTION nearby_mechanics(user_lat FLOAT, user_lng FLOAT, radius_km FLOAT DEFAULT 10)
RETURNS TABLE (
  id UUID, user_id UUID, latitude DECIMAL, longitude DECIMAL,
  address TEXT, specialization VARCHAR, hourly_rate DECIMAL,
  rating DECIMAL, total_reviews INTEGER, distance FLOAT,
  full_name VARCHAR, avatar_url TEXT
) AS $$
  SELECT m.id, m.user_id, m.latitude, m.longitude,
         m.address, m.specialization, m.hourly_rate,
         m.rating, m.total_reviews,
         distance_km(user_lat, user_lng, m.latitude::float, m.longitude::float) as distance,
         p.full_name, p.avatar_url
  FROM mechanics m
  JOIN profiles p ON p.id = m.user_id
  WHERE m.is_available = true
    AND m.latitude IS NOT NULL
    AND distance_km(user_lat, user_lng, m.latitude::float, m.longitude::float) <= radius_km
  ORDER BY distance;
$$ LANGUAGE sql STABLE;
```

**Update mechanic rating** (trigger after review insert):
```sql
CREATE OR REPLACE FUNCTION update_mechanic_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mechanics SET
    rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE mechanic_id = NEW.mechanic_id),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE mechanic_id = NEW.mechanic_id)
  WHERE id = NEW.mechanic_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mechanic_rating
AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION update_mechanic_rating();
```

---

## Authentication (Supabase Auth)

Use Supabase's built-in auth instead of custom JWT:

1. **Email/Password signup**: `supabase.auth.signUp({ email, password, options: { data: { full_name, phone, role } } })`
   - Database trigger auto-creates `profiles` row from `auth.users.raw_user_meta_data`
2. **Phone OTP** (optional): `supabase.auth.signInWithOtp({ phone })` for phone verification
3. **Login**: `supabase.auth.signInWithPassword({ email, password })`
4. **Password reset**: `supabase.auth.resetPasswordForEmail(email)` — Supabase sends the magic link automatically
5. **Session management**: `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()` — handled automatically by the Supabase client
6. **Role-based access**: Store role in `profiles.role`. Use in RLS policies via a helper function:
```sql
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## Supabase Edge Functions

Create these edge functions for server-side logic that can't run in the browser:

### 1. `razorpay-create-order`
- Receives: `{ booking_id, amount }`
- Creates Razorpay order using server-side secret
- Updates booking with `razorpay_order_id`
- Returns order details to client

### 2. `razorpay-verify-payment`
- Receives: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`
- Verifies HMAC signature using Razorpay secret
- Updates booking `payment_status = 'paid'` and stores payment ID
- Returns success/failure

### 3. `ai-triage` (optional)
- Receives: `{ problem_description }`
- Calls Groq/OpenAI API with a system prompt that returns JSON: `{ suggested_category, urgency, safety_tips }`
- Returns suggestion to client

---

## Frontend Architecture

### Project Structure
```
src/
  main.jsx                    # Entry point, Supabase client init
  App.jsx                     # React Router, auth-guarded routes
  lib/
    supabase.js               # Supabase client instance (createClient)
  context/
    AuthContext.jsx            # Wraps supabase.auth, exposes user/profile/role
    LocationContext.jsx        # Browser geolocation, localStorage persistence
    ThemeContext.jsx           # Dark/light mode
  pages/
    Login.jsx
    Register.jsx
    ForgotPassword.jsx
    ResetPassword.jsx
    UserDashboard.jsx          # Tabs: Find Mechanic, My Bookings, Profile
    MechanicDashboard.jsx      # Tabs: Overview, Available Jobs, Active, Completed
    AdminDashboard.jsx         # Tabs: Users, Mechanics, Bookings, Stats
    BookingDetail.jsx          # Status, chat, payment, review
    LocationGate.jsx           # Geolocation permission gate
  components/
    BookingChat.jsx            # Realtime chat via Supabase Realtime
    MapLocationPicker.jsx      # Mapbox GL location selector
    MechanicCard.jsx           # Mechanic info card
    BookingForm.jsx            # Vehicle details, service selection, payment method
    ReviewForm.jsx             # Star rating + comment
    StatusBadge.jsx            # Booking status pill
    ProfilePhotoUpload.jsx     # Upload to Supabase Storage
    NotificationPrompt.jsx     # Push notification opt-in
    ThemeToggle.jsx
  hooks/
    useAuth.js                 # Shortcut for AuthContext
    useLocation.js             # Shortcut for LocationContext
    useRealtimeBooking.js      # Subscribe to booking status changes
    useRealtimeChat.js         # Subscribe to new chat messages
    useNearbyMechanics.js      # Call nearby_mechanics RPC
  utils/
    phoneValidation.js         # E.164 formatting with libphonenumber-js
    bookingStatus.js           # Status labels, colors, allowed transitions
    mapbox.js                  # Mapbox helpers
    pricing.js                 # Calculate total from base + fees
```

### Supabase Client Setup (`lib/supabase.js`)
```jsx
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### Auth Context Pattern
```jsx
// context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  const value = {
    user,
    profile,
    loading,
    signUp: (email, password, metadata) =>
      supabase.auth.signUp({ email, password, options: { data: metadata } }),
    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    resetPassword: (email) => supabase.auth.resetPasswordForEmail(email),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
```

### Realtime Chat Pattern
```jsx
// hooks/useRealtimeChat.js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtimeChat(bookingId) {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    // Fetch existing messages
    supabase
      .from('booking_messages')
      .select('*, sender:profiles(full_name, avatar_url)')
      .eq('booking_id', bookingId)
      .order('created_at')
      .then(({ data }) => setMessages(data || []))

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${bookingId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'booking_messages',
        filter: `booking_id=eq.${bookingId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [bookingId])

  async function sendMessage(content, senderId) {
    await supabase.from('booking_messages').insert({
      booking_id: bookingId,
      sender_id: senderId,
      content,
    })
  }

  return { messages, sendMessage }
}
```

### Realtime Booking Status Pattern
```jsx
// hooks/useRealtimeBooking.js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtimeBooking(bookingId) {
  const [booking, setBooking] = useState(null)

  useEffect(() => {
    // Fetch booking
    supabase.from('bookings').select('*, mechanic:mechanics(*, profile:profiles(*)), category:service_categories(*)').eq('id', bookingId).single()
      .then(({ data }) => setBooking(data))

    // Subscribe to updates
    const channel = supabase
      .channel(`booking:${bookingId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `id=eq.${bookingId}`,
      }, (payload) => setBooking(prev => ({ ...prev, ...payload.new })))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [bookingId])

  return booking
}
```

---

## Core Features to Implement

### 1. Customer Flow
- **Register/Login** with email+password via Supabase Auth
- **Location gate**: Request browser geolocation on first visit, persist to context
- **Find mechanics**: Call `nearby_mechanics` RPC with user's lat/lng, display on Mapbox map + list
- **Create booking**: Select mechanic → fill vehicle details (photo uploaded to Supabase Storage) → pick service category → set payment method → submit
- **Track booking**: Realtime status updates via Supabase Realtime subscription
- **Chat**: Realtime messaging with assigned mechanic
- **Pay**: COD (default) or Razorpay online via edge function
- **Review**: Submit 1-5 star rating after job completion

### 2. Mechanic Flow
- **Register as mechanic**: Sign up with role=mechanic, then complete mechanic profile (location, specialization, rate)
- **Available jobs**: Query pending bookings within 10km, claim or reject
- **Manage active jobs**: Update status (accepted → in_progress → completed)
- **Chat**: Communicate with customers per booking
- **Confirm COD payment**: Mark cash received on completed jobs
- **Analytics dashboard**: Lifetime/monthly/daily earnings, job counts, average rating

### 3. Admin Flow
- **Dashboard**: System stats (total users, mechanics, bookings, revenue)
- **User management**: View/create customers and mechanics
- **Booking oversight**: View all bookings with filters

### 4. Booking Status Machine
```
pending → accepted → in_progress → completed
pending → cancelled (by user)
pending → rejected (by mechanic, makes it available for others)
```

### 5. Pricing Logic
```
total_price = base_charge + home_service_fee (if service_location='home') + service_price
```

---

## Row Level Security Policies (Critical)

Enable RLS on ALL tables. Key policies:

```sql
-- Profiles: users read/update own, admins read all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins read all profiles" ON profiles
  FOR SELECT USING (get_user_role() = 'admin');

-- Bookings: users see own, mechanics see assigned + nearby pending, admins see all
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Mechanics read assigned bookings" ON bookings
  FOR SELECT USING (
    mechanic_id IN (SELECT id FROM mechanics WHERE user_id = auth.uid())
  );

CREATE POLICY "Mechanics read pending bookings" ON bookings
  FOR SELECT USING (
    status = 'pending'
    AND mechanic_id IS NULL
    AND get_user_role() = 'mechanic'
  );

CREATE POLICY "Admins read all bookings" ON bookings
  FOR SELECT USING (get_user_role() = 'admin');

-- Chat: only booking participants
ALTER TABLE booking_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking participants access messages" ON booking_messages
  FOR ALL USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      LEFT JOIN mechanics m ON m.id = b.mechanic_id
      WHERE b.user_id = auth.uid() OR m.user_id = auth.uid()
    )
  );
```

---

## Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Maps
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token

# Phone formatting
VITE_DEFAULT_PHONE_REGION=IN

# Edge function secrets (set via Supabase dashboard, NOT in frontend)
# RAZORPAY_KEY_ID=
# RAZORPAY_KEY_SECRET=
# GROQ_API_KEY=
```

---

## Supabase Storage Buckets

Create two storage buckets:
1. **`vehicle-images`** — Public read, authenticated write. Max 5MB, image/* only.
2. **`avatars`** — Public read, authenticated write. Max 2MB, image/* only.

Upload pattern:
```jsx
const { data, error } = await supabase.storage
  .from('vehicle-images')
  .upload(`${userId}/${Date.now()}.jpg`, file)

const url = supabase.storage
  .from('vehicle-images')
  .getPublicUrl(data.path).data.publicUrl
```

---

## Seed Data

Insert these service categories on setup:

**Emergency services**: Breakdown Assistance, Flat Tire, Battery Jump Start, Towing, Fuel Delivery, Lockout Assistance

**Scheduled services**: Oil Change, Brake Service, Engine Tune-Up, AC Service, Car Wash & Detailing, General Inspection

Create one admin user: `admin@mobilemechanic.com` / `admin123` with `role = 'admin'`

---

## Key Differences from Express+PostgreSQL Version

| Concern | Express Version | Supabase Version |
|---------|----------------|-----------------|
| Auth | Custom JWT + bcrypt | Supabase Auth (built-in) |
| API | Express routes | Direct Supabase client queries + RPC |
| Authorization | Middleware (auth.js) | Row Level Security policies |
| Realtime | Polling hooks | Supabase Realtime subscriptions |
| File upload | Multer → Cloudinary | Supabase Storage |
| Email | Resend SDK | Supabase Auth emails (built-in) |
| Server-side logic | Express handlers | Supabase Edge Functions (Deno) |
| Database | pg driver + raw SQL | Supabase JS client (auto-typed) |
| SMS OTP | Twilio Verify | Supabase Phone Auth |

---

## Implementation Order

1. **Supabase project setup**: Create project, apply schema migrations, enable RLS, create storage buckets
2. **Auth**: Register, login, password reset, profile auto-creation trigger
3. **Mechanic profiles**: CRUD, nearby search RPC
4. **Service categories**: Seed data, list/filter
5. **Bookings**: Create, status updates, assignment, realtime subscriptions
6. **Chat**: Realtime messaging per booking
7. **Payments**: Razorpay edge functions, COD confirmation
8. **Reviews**: Submit, display, mechanic rating trigger
9. **Admin dashboard**: Stats, user/mechanic/booking management
10. **PWA + Push**: Service worker, offline caching
11. **AI triage**: Edge function with Groq (optional)
12. **Polish**: Error handling, loading states, mobile responsiveness, dark mode
