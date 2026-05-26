-- Migration: Discord 2채널 웹훅 컬럼 추가
-- projects 테이블에 discord_webhook_daily, discord_webhook_mustcheck 컬럼 추가

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS discord_webhook_daily TEXT,
  ADD COLUMN IF NOT EXISTS discord_webhook_mustcheck TEXT;

-- 기존 discord_webhook_url 데이터를 daily 채널로 마이그레이션 (옵션)
-- UPDATE projects SET discord_webhook_daily = discord_webhook_url WHERE discord_webhook_daily IS NULL AND discord_webhook_url IS NOT NULL;

COMMENT ON COLUMN projects.discord_webhook_daily IS '📊 일일 브리핑 전송 채널 웹훅 URL';
COMMENT ON COLUMN projects.discord_webhook_mustcheck IS '🔴 Must-Check 즉시 알림 채널 웹훅 URL';
