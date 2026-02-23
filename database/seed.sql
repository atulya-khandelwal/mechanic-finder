-- Seed data for Mobile Mechanic Application
-- Run after schema.sql
-- Note: Admin user is created via backend API or scripts (password hashed with bcrypt)

-- Create sample service categories (base_price in ₹)
INSERT INTO service_categories (name, description, type, base_price) VALUES
  ('Emergency - Breakdown', 'Vehicle breakdown, won''t start, overheating', 'emergency', 75),
  ('Emergency - Flat Tire', 'Flat tire change or repair', 'emergency', 50),
  ('Emergency - Battery Jump', 'Dead battery jump start', 'emergency', 40),
  ('Oil Change', 'Full synthetic or conventional oil change', 'scheduled', 60),
  ('Brake Inspection', 'Brake pad and rotor inspection', 'scheduled', 80),
  ('Car Cleaning', 'Interior and exterior cleaning', 'scheduled', 45),
  ('AC Service', 'Air conditioning recharge and repair', 'scheduled', 70);
