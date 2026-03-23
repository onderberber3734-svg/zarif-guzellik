-- Seans Planlarına Fiyatlandırma Modüllerinin Eklenmesi

-- 1. Fiyatlandırma ve Durum Kolonlarının Eklenmesi
ALTER TABLE public.session_plans
ADD COLUMN IF NOT EXISTS pricing_model text CHECK (pricing_model IN ('per_session', 'package_total')) DEFAULT 'package_total',
ADD COLUMN IF NOT EXISTS package_total_price numeric(10,2),
ADD COLUMN IF NOT EXISTS per_session_price numeric(10,2),
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'TRY',
ADD COLUMN IF NOT EXISTS payment_status text CHECK (payment_status IN ('unpaid', 'partial', 'paid')) DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2) DEFAULT 0;

-- 2. Check Constraintler (Garanti Modeli)
-- pricing_model='package_total' ise package_total_price dolu olmalı
-- pricing_model='per_session' ise per_session_price dolu olmalı
ALTER TABLE public.session_plans
ADD CONSTRAINT chk_pricing_model_fields CHECK (
    (pricing_model = 'package_total' AND package_total_price IS NOT NULL) OR
    (pricing_model = 'per_session' AND per_session_price IS NOT NULL AND package_total_price IS NULL) OR
    (pricing_model IS NULL) -- Eski veriler veya henüz seçilmemişler için esneklik (eğer update edeceksek)
);

-- Eski verilerdeki olası null hatalarını önlemek için varsayılan bir şeyler set edelim (Tercihen 0)
UPDATE public.session_plans
SET pricing_model = 'package_total', package_total_price = 0
WHERE pricing_model IS NULL;
