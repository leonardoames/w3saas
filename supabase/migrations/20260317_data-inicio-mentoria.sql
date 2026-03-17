-- Add data_inicio_mentoria to profiles (when the client started mentorship)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_inicio_mentoria DATE;

-- Add faturamento_inicial to diagnostico_360 (actual billing at the start of mentorship)
ALTER TABLE diagnostico_360 ADD COLUMN IF NOT EXISTS faturamento_inicial numeric;
