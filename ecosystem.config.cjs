module.exports = {
  apps: [
    {
      name: 'deliveryguard-pm',
      script: '/home/user/webapp/start-server.sh',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_SUPABASE_URL: 'https://czfnmvmcavenlxvyfkim.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Zm5tdm1jYXZlbmx4dnlma2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDA1NDgsImV4cCI6MjA5NTExNjU0OH0.QBsD8INinfVO5lbwnawghDe7wDArt_B6wGlYFcLljTA',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Zm5tdm1jYXZlbmx4dnlma2ltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU0MDU0OCwiZXhwIjoyMDk1MTE2NTQ4fQ.q2pMYBJtG6Y3Yh6rS5ahnKq4Pae0zpzGYgB1FXQncBY',
        // OPENAI_API_KEY는 start-server.sh에서 직접 export (시스템 빈값이 override하는 문제 방지)
        OPENAI_MODEL: 'gpt-4o',
        DISCORD_WEBHOOK_URL: '',
        NEXT_PUBLIC_APP_URL: 'https://3000-ioj61qb1kdgcvuropx8wt-b32ec7bb.sandbox.novita.ai',
        CRON_SECRET: 'deliveryguard-cron-2024',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
}
