ALTER TABLE public.salons
ADD COLUMN IF NOT EXISTS inactive_until DATE;
