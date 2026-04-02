-- salon_services tablosuna business_id sütununu ekle (Multi-tenant yapısı için kritik)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='salon_services' AND column_name='business_id') THEN
        ALTER TABLE public.salon_services ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- RLS Politikalarını Yenile (business_id ile daha güvenli ve hızlı)
DROP POLICY IF EXISTS "Users can view their own salon_services" ON public.salon_services;
DROP POLICY IF EXISTS "Users can insert their own salon_services" ON public.salon_services;
DROP POLICY IF EXISTS "Users can delete their own salon_services" ON public.salon_services;

-- Görüntüleme: Sadece kendi işletmesinin verilerini görsün
CREATE POLICY "Users can view their own salon_services" ON public.salon_services
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

-- Ekleme: Sadece kendi işletmesine eklesin
CREATE POLICY "Users can insert their own salon_services" ON public.salon_services
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

-- Silme: Sadece kendi işletmesine ait olanları silsin
CREATE POLICY "Users can delete their own salon_services" ON public.salon_services
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

-- Şema önbelleğini zorla yenile
NOTIFY pgrst, 'reload schema';
