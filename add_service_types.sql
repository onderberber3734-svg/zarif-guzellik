-- add_service_types.sql
-- Bu scripti Supabase SQL Editor üzerinden çalıştırınız.

-- 1. service_type kolonu ve check constraint'ini ekleyelim (varsayılan: single)
ALTER TABLE services
ADD COLUMN IF NOT EXISTS service_type text DEFAULT 'single' CHECK (service_type IN ('single', 'package'));

-- 2. Paket hizmetleri için gerekli varsayılan ayar kolonlarını ekleyelim
ALTER TABLE services
ADD COLUMN IF NOT EXISTS default_total_sessions integer,
ADD COLUMN IF NOT EXISTS default_interval_days integer,
ADD COLUMN IF NOT EXISTS default_package_price numeric;

-- 3. Kolon açıklamaları (Opsiyonel ama veritabanı düzeni için faydalıdır)
COMMENT ON COLUMN services.service_type IS 'Hizmet tipi: single (tek seans) veya package (paket)';
COMMENT ON COLUMN services.default_total_sessions IS 'Paket hizmetler için varsayılan toplam seans sayısı';
COMMENT ON COLUMN services.default_interval_days IS 'Paket hizmetler için seanslar arası varsayılan gün boşluğu (interval)';
COMMENT ON COLUMN services.default_package_price IS 'Paket hizmetler için varsayılan toplam paket fiyatı';

-- 4. Mevcut hizmetlerin tamamını güvene almak adına 'single' olarak garantileyelim
UPDATE services SET service_type = 'single' WHERE service_type IS NULL;
