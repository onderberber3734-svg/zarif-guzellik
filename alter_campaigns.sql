ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS channel text[] DEFAULT '{"none"}',
ADD COLUMN IF NOT EXISTS send_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS offer_details text;
