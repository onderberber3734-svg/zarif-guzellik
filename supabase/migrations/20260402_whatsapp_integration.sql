-- ═══════════════════════════════════════════════════════════════════
-- WHATSAPP ENTEGRASYONU — Veritabanı Migration
-- Multi-tenant, RLS-uyumlu, AI analiz uyumlu mesaj takibi
-- ═══════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────
-- 1. whatsapp_accounts — Tenant bazlı WA Business bağlantısı
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_accounts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  waba_id               text,                          -- WhatsApp Business Account ID
  phone_number_id       text NOT NULL,                  -- Meta Phone Number ID
  phone_number          text NOT NULL,                  -- İşletmenin WA numarası (+90...)
  access_token          text NOT NULL,                  -- Meta permanent access token
  webhook_verify_token  text NOT NULL,                  -- Webhook doğrulama tokeni
  status                text NOT NULL DEFAULT 'pending', -- pending / active / disconnected
  connected_at          timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────
-- 2. whatsapp_conversations — Müşteri-işletme sohbet takibi
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id           uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  wa_contact_phone      text NOT NULL,                  -- Müşterinin WA numarası (+90...)
  wa_contact_name       text,                            -- WhatsApp profil adı
  status                text NOT NULL DEFAULT 'open',    -- open / closed / ai_handling / human_handling
  last_message_at       timestamptz,
  last_message_preview  text,
  unread_count          int NOT NULL DEFAULT 0,
  intent                text,                            -- lead / appointment / support / winback / campaign_reply
  source                text DEFAULT 'inbound',          -- inbound / campaign / reminder / winback / no_show
  campaign_id           uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ai_context            jsonb DEFAULT '{}'::jsonb,       -- AI agent bağlamı (son intent, öneriler vs.)
  assigned_to           uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- İnsan devri yapıldıysa
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE(business_id, wa_contact_phone)
);

-- ────────────────────────────────────────────────────────
-- 3. whatsapp_messages — Mesaj geçmişi (AI analiz uyumlu)
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  conversation_id       uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  wa_message_id         text,                            -- Meta mesaj ID'si
  direction             text NOT NULL,                   -- inbound / outbound
  message_type          text NOT NULL DEFAULT 'text',    -- text / template / image / interactive / button
  content               text,                            -- Mesaj içeriği
  template_name         text,                            -- Kullanılan template adı
  template_params       jsonb,                           -- Template değişkenleri
  status                text DEFAULT 'sent',             -- sent / delivered / read / failed
  error_code            text,                            -- Meta hata kodu
  error_message         text,                            -- Meta hata mesajı
  sender_type           text DEFAULT 'system',           -- system / ai / human / customer
  metadata              jsonb DEFAULT '{}'::jsonb,       -- { intent, campaign_id, appointment_id, ai_confidence }
  sent_at               timestamptz DEFAULT now(),
  delivered_at          timestamptz,
  read_at               timestamptz,
  created_at            timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────
-- 4. appointments tablosuna reminder_sent_at ekleme
-- ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'reminder_sent_at'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN reminder_sent_at timestamptz;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — Mevcut tenant isolation pattern
-- ═══════════════════════════════════════════════════════

-- whatsapp_accounts RLS
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_accounts_select" ON public.whatsapp_accounts FOR SELECT
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "wa_accounts_insert" ON public.whatsapp_accounts FOR INSERT
  WITH CHECK (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "wa_accounts_update" ON public.whatsapp_accounts FOR UPDATE
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "wa_accounts_delete" ON public.whatsapp_accounts FOR DELETE
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

-- whatsapp_conversations RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_conversations_select" ON public.whatsapp_conversations FOR SELECT
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "wa_conversations_insert" ON public.whatsapp_conversations FOR INSERT
  WITH CHECK (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "wa_conversations_update" ON public.whatsapp_conversations FOR UPDATE
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "wa_conversations_delete" ON public.whatsapp_conversations FOR DELETE
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

-- whatsapp_messages RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_messages_select" ON public.whatsapp_messages FOR SELECT
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "wa_messages_insert" ON public.whatsapp_messages FOR INSERT
  WITH CHECK (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "wa_messages_update" ON public.whatsapp_messages FOR UPDATE
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "wa_messages_delete" ON public.whatsapp_messages FOR DELETE
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

-- SERVICE ROLE bypass policy — Webhook handler için (createAdminClient kullanır)
CREATE POLICY "wa_conversations_service_all" ON public.whatsapp_conversations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "wa_messages_service_all" ON public.whatsapp_messages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "wa_accounts_service_select" ON public.whatsapp_accounts FOR SELECT
  USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════
-- INDEXES — Performans
-- ═══════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_wa_accounts_business ON public.whatsapp_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_wa_accounts_phone_number_id ON public.whatsapp_accounts(phone_number_id);

CREATE INDEX IF NOT EXISTS idx_wa_conversations_business ON public.whatsapp_conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_customer ON public.whatsapp_conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_phone ON public.whatsapp_conversations(wa_contact_phone);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_last_msg ON public.whatsapp_conversations(business_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_status ON public.whatsapp_conversations(business_id, status);

CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_wa_id ON public.whatsapp_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_business_dir ON public.whatsapp_messages(business_id, direction);
CREATE INDEX IF NOT EXISTS idx_wa_messages_sent_at ON public.whatsapp_messages(sent_at DESC);
