-- ═══════════════════════════════════════════════════════
-- AI INSIGHTS TABLOSU — Multi-tenant AI cache/storage
-- ═══════════════════════════════════════════════════════

CREATE TABLE public.ai_insights (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  insight_type    text NOT NULL,            -- 'daily_summary' | 'fill_empty_slots' | 'campaign_copy' | 'winback'
  params_hash     text,                     -- SHA-256 hash of sorted params JSON (null for parameterless types)
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,  -- AI response: { summary, bullets, ... }
  generated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, insight_type, params_hash)
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "tenant_read" ON public.ai_insights
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

-- INSERT
CREATE POLICY "tenant_insert" ON public.ai_insights
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

-- UPDATE
CREATE POLICY "tenant_update" ON public.ai_insights
  FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

-- DELETE
CREATE POLICY "tenant_delete" ON public.ai_insights
  FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

-- ─── INDEXES ──────────────────────────────────────────
CREATE INDEX idx_ai_insights_biz_type ON public.ai_insights(business_id, insight_type);
CREATE INDEX idx_ai_insights_generated ON public.ai_insights(generated_at);