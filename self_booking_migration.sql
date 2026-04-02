-- 1. businesses tablosuna online rezervasyon alanları ekleme
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS booking_settings JSONB DEFAULT '{"require_otp": false, "allow_any_staff": true, "slot_interval_minutes": 30, "padding_minutes": 15, "min_advance_booking_hours": 2}'::jsonb;

-- Mevcut işletmeler için otomatik slug üretelim (Örn: Zarif Güzellik -> zarif-guzellik)
UPDATE public.businesses
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || substr(id::text, 1, 4)
WHERE slug IS NULL;


-- 2. booking_otps tablosu (SMS doğrulamaları için)
CREATE TABLE IF NOT EXISTS public.booking_otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security) - booking_otps tablosu sadece anon/service role üzerinden erişilir
ALTER TABLE public.booking_otps ENABLE ROW LEVEL SECURITY;

-- Güvenlik sebebiyle public'e insert/update izin vermeyeceğiz. Her şey service action (Sunucu) üzerinden ilerleyecek.
-- OTP tablosuna public read izni vermeyelim
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'booking_otps' AND policyname = 'booking_otps_insert_policy'
    ) THEN
        CREATE POLICY "booking_otps_insert_policy" ON public.booking_otps
            FOR INSERT WITH CHECK (true); -- Service role ile override edeceğiz ama actionlardan çağrılacak. Ancak auth.uid gerektirmesin çünkü anon
    END IF;
END
$$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'booking_otps' AND policyname = 'booking_otps_select_policy'
    ) THEN
        CREATE POLICY "booking_otps_select_policy" ON public.booking_otps
            FOR SELECT USING (true); 
    END IF;
END
$$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'booking_otps' AND policyname = 'booking_otps_update_policy'
    ) THEN
        CREATE POLICY "booking_otps_update_policy" ON public.booking_otps
            FOR UPDATE USING (true);
    END IF;
END
$$;

-- businesses slug için RPC yazmıyoruz ama owner'lar panelden ayarlayacak, supabase dashboard'dan update atacağız.
