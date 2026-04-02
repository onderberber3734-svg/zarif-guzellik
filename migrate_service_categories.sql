-- Create service_categories table
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own business service categories" ON public.service_categories;
CREATE POLICY "Users can view their own business service categories"
    ON public.service_categories FOR SELECT
    USING (business_id IN (
        SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert their own business service categories" ON public.service_categories;
CREATE POLICY "Users can insert their own business service categories"
    ON public.service_categories FOR INSERT
    WITH CHECK (business_id IN (
        SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update their own business service categories" ON public.service_categories;
CREATE POLICY "Users can update their own business service categories"
    ON public.service_categories FOR UPDATE
    USING (business_id IN (
        SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can delete their own business service categories" ON public.service_categories;
CREATE POLICY "Users can delete their own business service categories"
    ON public.service_categories FOR DELETE
    USING (business_id IN (
        SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    ));

-- Add category_id to services
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL;

-- Migrate existing data
DO $$
DECLARE
    biz RECORD;
    cat_record RECORD;
    genel_cat_id UUID;
BEGIN
    FOR biz IN SELECT id FROM public.businesses LOOP
        -- Ensure 'Genel' category exists
        INSERT INTO public.service_categories (business_id, name)
        VALUES (biz.id, 'Genel')
        ON CONFLICT DO NOTHING
        RETURNING id INTO genel_cat_id;
        
        IF genel_cat_id IS NULL THEN
            SELECT id INTO genel_cat_id FROM public.service_categories WHERE business_id = biz.id AND name = 'Genel' LIMIT 1;
        END IF;

        -- Create categories from existing text 'category' column
        FOR cat_record IN 
            SELECT DISTINCT category 
            FROM public.services 
            WHERE business_id = biz.id AND category IS NOT NULL AND category != ''
        LOOP
            INSERT INTO public.service_categories (business_id, name)
            SELECT biz.id, cat_record.category
            WHERE NOT EXISTS (
                SELECT 1 FROM public.service_categories WHERE business_id = biz.id AND name = cat_record.category
            );
        END LOOP;

        -- Map existing services to their new category_id
        UPDATE public.services s
        SET category_id = (
            SELECT id FROM public.service_categories sc 
            WHERE sc.business_id = s.business_id 
              AND sc.name = s.category
            LIMIT 1
        )
        WHERE s.business_id = biz.id AND s.category IS NOT NULL AND s.category != '';

        -- Fallback: services without a mapped category get 'Genel'
        UPDATE public.services s
        SET category_id = genel_cat_id
        WHERE s.business_id = biz.id AND s.category_id IS NULL;

    END LOOP;
END $$;
