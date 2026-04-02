-- 1. YENİ TABLO: session_plans
CREATE TABLE IF NOT EXISTS session_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    total_sessions INT NOT NULL DEFAULT 1,
    completed_sessions INT NOT NULL DEFAULT 0,
    recommended_interval_days INT DEFAULT 30,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'canceled')),
    start_date TIMESTAMPTZ DEFAULT now(),
    next_recommended_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security) - session_plans
ALTER TABLE session_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for business users" ON session_plans
    FOR SELECT USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

CREATE POLICY "Enable insert access for business users" ON session_plans
    FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

CREATE POLICY "Enable update access for business users" ON session_plans
    FOR UPDATE USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

CREATE POLICY "Enable delete access for business users" ON session_plans
    FOR DELETE USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));


-- 2. GÜNCELLENECEK TABLO: appointment_services
ALTER TABLE appointment_services 
ADD COLUMN IF NOT EXISTS session_plan_id UUID REFERENCES session_plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS session_number INT;

-- 3. SEANS NUMARASI ÇAKIŞMASINI ENGELLEME (Aynı planda aynı seans no olamaz, null haric)
-- Null'lara izin veren bir unique index oluşturuyoruz (Postgres 15+ veya partial index gerekir)
CREATE UNIQUE INDEX IF NOT EXISTS unq_session_plan_number 
ON appointment_services (session_plan_id, session_number) 
WHERE session_plan_id IS NOT NULL AND session_number IS NOT NULL;


-- 4. OTOMATİK TAMAMLANMIŞ SEANS VE SONRAKİ SEANS (next_recommended_date) GÜNCELLEYİCİ
-- Bir session plan'ın metriklerini dinamik olarak baştan hesaplamak için fonksiyon (appointment_services'deki gerçek tablo verisine güvenir)
CREATE OR REPLACE FUNCTION update_session_plan_metrics(v_plan_id UUID) RETURNS VOID AS $$
DECLARE
    v_completed_count INT;
    v_latest_date DATE;
    v_rec_interval INT;
BEGIN
    -- Sadece 'completed' olan randevulara ait servisleri say ve en son randevu tarihini bul
    SELECT COUNT(aps.id), MAX(a.appointment_date)
    INTO v_completed_count, v_latest_date
    FROM appointment_services aps
    JOIN appointments a ON aps.appointment_id = a.id
    WHERE aps.session_plan_id = v_plan_id
      AND a.status = 'completed';
      
    -- Tavsiye edilen aralığı plandan al
    SELECT recommended_interval_days INTO v_rec_interval
    FROM session_plans
    WHERE id = v_plan_id;

    -- Planı tamamen güvenilir (hesaplanabilir) data ile güncelle
    UPDATE session_plans
    SET completed_sessions = COALESCE(v_completed_count, 0),
        next_recommended_date = CASE 
            WHEN v_latest_date IS NOT NULL AND v_rec_interval IS NOT NULL 
            THEN v_latest_date + (v_rec_interval || ' days')::interval
            WHEN v_latest_date IS NULL AND v_rec_interval IS NOT NULL
            THEN DATE(start_date) + (v_rec_interval || ' days')::interval
            ELSE next_recommended_date
        END,
        status = CASE 
            WHEN COALESCE(v_completed_count, 0) >= total_sessions THEN 'completed'
            WHEN status = 'completed' AND COALESCE(v_completed_count, 0) < total_sessions THEN 'active'
            ELSE status
        END,
        updated_at = now()
    WHERE id = v_plan_id;
END;
$$ LANGUAGE plpgsql;


-- 5. TRİGGER'LAR
-- A) Appointment (Randevu) durumu değişirse (Örn: scheduled -> completed), bağlı tüm session_plan'leri güncelle
CREATE OR REPLACE FUNCTION trigger_update_session_on_appt_status() RETURNS TRIGGER AS $$
DECLARE
    plan_record RECORD;
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        FOR plan_record IN (SELECT DISTINCT session_plan_id FROM appointment_services WHERE appointment_id = NEW.id AND session_plan_id IS NOT NULL)
        LOOP
            PERFORM update_session_plan_metrics(plan_record.session_plan_id);
        END LOOP;
    ELSIF (TG_OP = 'DELETE') THEN
        FOR plan_record IN (SELECT DISTINCT session_plan_id FROM appointment_services WHERE appointment_id = OLD.id AND session_plan_id IS NOT NULL)
        LOOP
            PERFORM update_session_plan_metrics(plan_record.session_plan_id);
        END LOOP;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appt_status_changed ON appointments;
CREATE TRIGGER trg_appt_status_changed
AFTER UPDATE OR DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION trigger_update_session_on_appt_status();

-- B) Appointment_services'e seans eklenir, güncellenir veya silinirse
CREATE OR REPLACE FUNCTION trigger_update_session_on_appt_service() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.session_plan_id IS NOT NULL) THEN
        PERFORM update_session_plan_metrics(NEW.session_plan_id);
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (NEW.session_plan_id IS NOT NULL) THEN
            PERFORM update_session_plan_metrics(NEW.session_plan_id);
        END IF;
        IF (OLD.session_plan_id IS NOT NULL AND OLD.session_plan_id IS DISTINCT FROM NEW.session_plan_id) THEN
            PERFORM update_session_plan_metrics(OLD.session_plan_id);
        END IF;
    ELSIF (TG_OP = 'DELETE' AND OLD.session_plan_id IS NOT NULL) THEN
        PERFORM update_session_plan_metrics(OLD.session_plan_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appt_service_changed ON appointment_services;
CREATE TRIGGER trg_appt_service_changed
AFTER INSERT OR UPDATE OR DELETE ON appointment_services
FOR EACH ROW EXECUTE FUNCTION trigger_update_session_on_appt_service();
