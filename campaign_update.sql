-- KAMPANYA MODÜLÜ VE AI LOGLARI İÇİN SQL GÜNCELLEMESİ (Supabase SQL Editor üzerinden çalıştırın)

-- 1. Kampanyalar (Campaigns) Tablosu
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  type text NOT NULL, -- 'winback', 'vip_offer', 'repeat_visit', 'loyalty_upgrade', 'custom' vs.
  offer_type text, -- 'percentage_discount', 'fixed_discount', 'bundle_offer', 'free_addon', 'package_upgrade'
  target_segment text NOT NULL, -- 'risk', 'vip', 'new', 'loyal', 'all'
  status text DEFAULT 'draft', -- 'draft', 'active', 'completed', 'paused'
  start_date timestamptz,
  end_date timestamptz,
  estimated_audience_count int DEFAULT 0,
  estimated_conversion_count int DEFAULT 0,
  actual_conversion_count int DEFAULT 0,
  expected_revenue_impact numeric DEFAULT 0,
  actual_revenue_impact numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Kampanya Hedef Kitle İşlem Tablosu (Campaign Targets)
CREATE TABLE IF NOT EXISTS campaign_targets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'contacted', 'converted', 'ignored'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, customer_id)
);

-- 3. AI İşlem Logları (AI Logs)
CREATE TABLE IF NOT EXISTS ai_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  module text NOT NULL, -- 'campaign_generation', 'customer_insight' vs.
  prompt text,
  response text,
  error_message text,
  duration_ms int,
  created_at timestamptz DEFAULT now()
);

-- 4. RLS AKTİFLEŞTİRME
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLİTİKALARI
CREATE POLICY "Sadece işletme personeli kendi kampanyalarını görebilir ve yönetebilir" ON campaigns
  FOR ALL USING (
    business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Sadece işletme personeli kendi kampanya hedeflerine ulaşabilir" ON campaign_targets
  FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()))
  );

CREATE POLICY "Sadece işletme personeli AI loglarını görebilir" ON ai_logs
  FOR ALL USING (
    business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
  );
