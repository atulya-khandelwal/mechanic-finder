-- Migration: Add UNIQUE constraint on phone (email is already UNIQUE)
-- Run: psql -d your_database -f database/migration-unique-phone.sql

-- Add unique constraint on phone (allows multiple NULLs)
ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);
