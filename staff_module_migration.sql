create extension if not exists "pgcrypto";

-- 1. STAFF (Personel) Tablosu
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    role TEXT DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. STAFF_SERVICES (Personelin Verdiği Hizmetler) Tablosu
CREATE TABLE IF NOT EXISTS public.staff_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(staff_id, service_id)
);

-- 3. STAFF_WORKING_HOURS (Personel Çalışma Saatleri)
CREATE TABLE IF NOT EXISTS public.staff_working_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    is_closed BOOLEAN DEFAULT false,
    start_time TIME,
    end_time TIME,
    break_start TIME,
    break_end TIME,
    UNIQUE(staff_id, day_of_week),
    CONSTRAINT check_working_hours_time_order CHECK (
        (is_closed = true) OR 
        (
            start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time AND
            (
                (break_start IS NULL AND break_end IS NULL) OR
                (
                    break_start IS NOT NULL AND break_end IS NOT NULL AND 
                    break_start < break_end AND 
                    break_start >= start_time AND 
                    break_end <= end_time
                )
            )
        )
    )
);

-- 4. STAFF_TIME_OFF (İzinler ve Kapalı Günler)
CREATE TABLE IF NOT EXISTS public.staff_time_off (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'approved',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT check_time_off_dates CHECK (start_date <= end_date)
);

-- 5. APPOINTMENTS Tablosu Güncellemesi
-- Postgres 11+ IF NOT EXISTS desteği
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;

-- 6. RLS (Row Level Security) POLİTİKALARI
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Tenant isolation for staff" ON public.staff
        FOR ALL USING (business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Tenant isolation for staff_services" ON public.staff_services
        FOR ALL USING (business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.staff_working_hours ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Tenant isolation for staff_working_hours" ON public.staff_working_hours
        FOR ALL USING (business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.staff_time_off ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Tenant isolation for staff_time_off" ON public.staff_time_off
        FOR ALL USING (business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
