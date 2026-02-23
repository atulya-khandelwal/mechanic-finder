-- Mobile Mechanic Application - PostgreSQL Schema
-- Run this script to create all required tables

-- Enable UUID extension for unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
CREATE TYPE user_role AS ENUM ('user', 'mechanic', 'admin');

-- Service type enum
CREATE TYPE service_type AS ENUM ('emergency', 'scheduled');

-- Booking status enum
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');

-- Users table (covers both regular users and admins)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) UNIQUE,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mechanics table (extends users - mechanics have location and specialization)
CREATE TABLE mechanics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,
  specialization VARCHAR(255),
  hourly_rate DECIMAL(10, 2),
  is_available BOOLEAN DEFAULT true,
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service categories (e.g., Oil Change, Brake Repair, Emergency)
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type service_type NOT NULL,
  base_price DECIMAL(10, 2) DEFAULT 50.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mechanic services (what services each mechanic offers)
CREATE TABLE mechanic_services (
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
  category_id UUID REFERENCES service_categories(id) ON DELETE CASCADE,
  price DECIMAL(10, 2),
  PRIMARY KEY (mechanic_id, category_id)
);

-- User locations (for finding mechanics near user)
CREATE TABLE user_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings/Service requests
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  user_latitude DECIMAL(10, 8) NOT NULL,
  user_longitude DECIMAL(11, 8) NOT NULL,
  user_address TEXT,
  scheduled_at TIMESTAMP,
  status booking_status DEFAULT 'pending',
  description TEXT,
  vehicle_image TEXT,
  vehicle_number VARCHAR(50),
  vehicle_make VARCHAR(100),
  vehicle_model VARCHAR(100),
  vehicle_year INTEGER,
  problem_description TEXT,
  service_location VARCHAR(20) DEFAULT 'home',
  base_charge DECIMAL(10, 2) DEFAULT 25.00,
  home_service_fee DECIMAL(10, 2) DEFAULT 15.00,
  service_price DECIMAL(10, 2),
  total_price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_mechanics_location ON mechanics(latitude, longitude);
CREATE INDEX idx_mechanics_available ON mechanics(is_available) WHERE is_available = true;
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_mechanic ON bookings(mechanic_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Function to calculate distance (Haversine formula in km)
CREATE OR REPLACE FUNCTION distance_km(
  lat1 DECIMAL, lon1 DECIMAL,
  lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN 6371 * acos(
    LEAST(1, GREATEST(-1,
      sin(radians(lat1::float)) * sin(radians(lat2::float)) +
      cos(radians(lat1::float)) * cos(radians(lat2::float)) * cos(radians(lon2::float - lon1::float))
    ))
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
