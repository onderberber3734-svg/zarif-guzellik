-- 1. Tabloyu TEMİZLEYİP YENİDEN KURUYORUZ (En sağlam yol)
DROP TABLE IF EXISTS public.salon_services;

CREATE TABLE public.salon_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(salon_id, service_id)
);

-- 2. Mevcut verileri business_id ile doldur (Eğer salons tablosunda veri varsa)
UPDATE public.salon_services ss
SET business_id = s.business_id
FROM public.salons s
WHERE ss.salon_id = s.id;

-- 3. RLS Ayarları
ALTER TABLE public.salon_services ENABLE ROW LEVEL SECURITY;

-- Sadece kendi işletmesinin verilerini görsün, eklesin ve silsin
CREATE POLICY "salon_services_all_actions" ON public.salon_services
    FOR ALL 
    USING (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

-- 4. Supabase Şema Önbelleğini Zorla Yenile
NOTIFY pgrst, 'reload schema';
