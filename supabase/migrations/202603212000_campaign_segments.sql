-- campaign_segments tablosu
CREATE TABLE IF NOT EXISTS public.campaign_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    name TEXT,
    source_context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- campaign_segment_members tablosu
CREATE TABLE IF NOT EXISTS public.campaign_segment_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    segment_id UUID NOT NULL REFERENCES public.campaign_segments(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    score INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(segment_id, customer_id)
);

-- RLS etkinleştirme
ALTER TABLE public.campaign_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_segment_members ENABLE ROW LEVEL SECURITY;

-- campaign_segments için POLICY
CREATE POLICY "Users can view their own campaign_segments"
ON public.campaign_segments
FOR SELECT
USING (
    business_id IN (
        SELECT business_id FROM public.business_users
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own campaign_segments"
ON public.campaign_segments
FOR INSERT
WITH CHECK (
    business_id IN (
        SELECT business_id FROM public.business_users
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own campaign_segments"
ON public.campaign_segments
FOR UPDATE
USING (
    business_id IN (
        SELECT business_id FROM public.business_users
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own campaign_segments"
ON public.campaign_segments
FOR DELETE
USING (
    business_id IN (
        SELECT business_id FROM public.business_users
        WHERE user_id = auth.uid()
    )
);

-- campaign_segment_members için POLICY
CREATE POLICY "Users can view their own campaign_segment_members"
ON public.campaign_segment_members
FOR SELECT
USING (
    business_id IN (
        SELECT business_id FROM public.business_users
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own campaign_segment_members"
ON public.campaign_segment_members
FOR INSERT
WITH CHECK (
    business_id IN (
        SELECT business_id FROM public.business_users
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own campaign_segment_members"
ON public.campaign_segment_members
FOR UPDATE
USING (
    business_id IN (
        SELECT business_id FROM public.business_users
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own campaign_segment_members"
ON public.campaign_segment_members
FOR DELETE
USING (
    business_id IN (
        SELECT business_id FROM public.business_users
        WHERE user_id = auth.uid()
    )
);

-- Supabase Realtime (opsiyonel ama tutarlılık için)
alter publication supabase_realtime add table campaign_segments;
alter publication supabase_realtime add table campaign_segment_members;
