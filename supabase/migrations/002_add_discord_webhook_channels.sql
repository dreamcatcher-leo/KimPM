ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS discord_webhook_daily TEXT,
  ADD COLUMN IF NOT EXISTS discord_webhook_mustcheck TEXT;
