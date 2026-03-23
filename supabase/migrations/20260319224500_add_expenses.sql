-- 1. Create the expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add an updated_at trigger
CREATE OR REPLACE FUNCTION update_expenses_mod_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION update_expenses_mod_time();

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
CREATE POLICY "Users can view their own business expenses" ON public.expenses
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own business expenses" ON public.expenses
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own business expenses" ON public.expenses
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own business expenses" ON public.expenses
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_expenses_business_date ON public.expenses(business_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(business_id, category);
