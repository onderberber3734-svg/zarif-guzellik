-- Önceden var olan işletmelerin kurulumunu tamamlanmış olarak işaretle
UPDATE businesses
SET is_onboarding_completed = TRUE
WHERE is_onboarding_completed = FALSE;
