-- Add Shopee Ads / paid traffic enrichment columns to metrics_diarias
-- These allow storing impression/click data from ad platform integrations

ALTER TABLE metrics_diarias
  ADD COLUMN IF NOT EXISTS impressoes bigint,
  ADD COLUMN IF NOT EXISTS cliques bigint;

COMMENT ON COLUMN metrics_diarias.impressoes IS 'Total de impressões de anúncios (Shopee Ads, Google Ads, Meta Ads)';
COMMENT ON COLUMN metrics_diarias.cliques IS 'Total de cliques em anúncios (Shopee Ads, Google Ads, Meta Ads)';
