CREATE TABLE IF NOT EXISTS public.salon_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(salon_id, service_id)
);

-- RLS (Row Level Security) Policies
ALTER TABLE public.salon_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own salon_services" ON public.salon_services
    FOR SELECT USING (
        salon_id IN (
            SELECT id FROM public.salons WHERE business_id IN (
                SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert their own salon_services" ON public.salon_services
    FOR INSERT WITH CHECK (
        salon_id IN (
            SELECT id FROM public.salons WHERE business_id IN (
                SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete their own salon_services" ON public.salon_services
    FOR DELETE USING (
        salon_id IN (
            SELECT id FROM public.salons WHERE business_id IN (
                SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
            )
        )
    );
