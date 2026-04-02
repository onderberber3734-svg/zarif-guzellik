-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.business_working_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    is_closed BOOLEAN NOT NULL DEFAULT false,
    start_time TIME,
    end_time TIME,
    break_start TIME,
    break_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure each business only has one entry per day of the week
    CONSTRAINT unique_business_day UNIQUE (business_id, day_of_week),
    
    -- Validations
    -- If not closed, must have valid start and end time where start < end
    CONSTRAINT check_working_hours 
        CHECK (is_closed OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)),
        
    -- If there's a break, break_start must be before break_end, and it must fit inside working hours
    CONSTRAINT check_break_hours 
        CHECK (
            (break_start IS NULL AND break_end IS NULL) OR 
            (
                break_start IS NOT NULL AND break_end IS NOT NULL AND 
                break_start < break_end AND
                break_start >= start_time AND 
                break_end <= end_time
            )
        )
);

-- 2. Add an updated_at trigger for convenience
CREATE OR REPLACE FUNCTION update_working_hours_mod_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_working_hours_updated_at ON public.business_working_hours;
CREATE TRIGGER trg_working_hours_updated_at
BEFORE UPDATE ON public.business_working_hours
FOR EACH ROW EXECUTE FUNCTION update_working_hours_mod_time();

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.business_working_hours ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies (tenant isolation matching existing businesses)
CREATE POLICY "Users can view their own business working hours" ON public.business_working_hours
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own business working hours" ON public.business_working_hours
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own business working hours" ON public.business_working_hours
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own business working hours" ON public.business_working_hours
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

-- Add an index for faster lookups based on business and day
CREATE INDEX IF NOT EXISTS idx_working_hours_business_day ON public.business_working_hours(business_id, day_of_week);
