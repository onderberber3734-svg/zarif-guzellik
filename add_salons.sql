-- Create the salons table
CREATE TABLE IF NOT EXISTS public.salons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    color_code VARCHAR(50) DEFAULT '#805ad5',
    capacity INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add salons table RLS
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own salons" ON public.salons
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own salons" ON public.salons
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own salons" ON public.salons
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own salons" ON public.salons
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

-- Add salon_id to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES public.salons(id);
