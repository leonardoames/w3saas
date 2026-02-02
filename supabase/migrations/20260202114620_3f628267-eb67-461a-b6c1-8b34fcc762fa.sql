-- Add platform column to metrics_diarias
ALTER TABLE metrics_diarias ADD COLUMN IF NOT EXISTS platform text DEFAULT 'outros';

-- Drop existing unique constraint
ALTER TABLE metrics_diarias DROP CONSTRAINT IF EXISTS metrics_diarias_user_id_data_key;

-- Create new unique constraint including platform
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_date_platform ON metrics_diarias (user_id, data, platform);