-- 1. session_plans tablosuna ödeme modu alanının eklenmesi
ALTER TABLE public.session_plans
ADD COLUMN IF NOT EXISTS payment_mode text CHECK (payment_mode IN ('per_session', 'prepaid_full')) DEFAULT 'prepaid_full';

-- Not: paid_amount, package_total_price ve payment_status kolonları önceki (add_session_pricing.sql) ile eklenmişti. 
-- balance_due hesaplamasını uygulama (client) veya API tarafında (package_total_price - paid_amount) yapacağız ki veri tutarlılığı kolay sağlansın.

-- 2. payments tablosunun oluşturulması (Tahsilatlar)
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    session_plan_id uuid REFERENCES public.session_plans(id) ON DELETE SET NULL,
    appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
    amount numeric(10,2) NOT NULL CHECK (amount > 0),
    payment_method text CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer', 'other')) DEFAULT 'cash',
    paid_at timestamptz DEFAULT now(),
    notes text,
    created_at timestamptz DEFAULT now()
);

-- RLS (Row Level Security) Aktifleştirilmesi
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments of their business"
    ON public.payments FOR SELECT
    USING (business_id IN (
        SELECT business_id FROM business_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert payments to their business"
    ON public.payments FOR INSERT
    WITH CHECK (business_id IN (
        SELECT business_id FROM business_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update payments of their business"
    ON public.payments FOR UPDATE
    USING (business_id IN (
        SELECT business_id FROM business_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete payments of their business"
    ON public.payments FOR DELETE
    USING (business_id IN (
        SELECT business_id FROM business_users WHERE user_id = auth.uid()
    ));

-- Hızlı Sorgular İçin İndeksler
CREATE INDEX IF NOT EXISTS idx_payments_business_id ON public.payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_session_plan_id ON public.payments(session_plan_id);
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments(appointment_id);
