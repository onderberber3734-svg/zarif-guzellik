-- Add is_vip and birth_date to customers table
ALTER TABLE customers ADD COLUMN is_vip BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN birth_date DATE;
