
-- Create channel_settings table
CREATE TABLE public.channel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel_key text NOT NULL,
  min_roas numeric(10,2) DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_key)
);

-- Enable RLS
ALTER TABLE public.channel_settings ENABLE ROW LEVEL SECURITY;

-- RLS: users can only access their own settings
CREATE POLICY "Users can view own channel settings"
  ON public.channel_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own channel settings"
  ON public.channel_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own channel settings"
  ON public.channel_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own channel settings"
  ON public.channel_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_channel_settings_updated_at
  BEFORE UPDATE ON public.channel_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
