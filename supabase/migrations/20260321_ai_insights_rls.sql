-- Eski global takibi sil
DROP POLICY IF EXISTS "ai_insights_all_policy" ON public.ai_insights;

-- 1. Yalnızca Kendi İşletmesinin verilerini Okuyabilsin (SELECT)
CREATE POLICY "ai_insights_select" ON public.ai_insights
FOR SELECT USING (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);

-- 2. Yalnızca Kendi İşletmesine ait veri Ekleyebilsin (INSERT)
CREATE POLICY "ai_insights_insert" ON public.ai_insights
FOR INSERT WITH CHECK (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);

-- 3. Yalnızca Kendi İşletmesinin verisini Güncelleyebilsin (UPDATE)
CREATE POLICY "ai_insights_update" ON public.ai_insights
FOR UPDATE USING (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
) WITH CHECK (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);

-- 4. Yalnızca Kendi İşletmesinin verisini Silebilsin (DELETE)
CREATE POLICY "ai_insights_delete" ON public.ai_insights
FOR DELETE USING (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);
