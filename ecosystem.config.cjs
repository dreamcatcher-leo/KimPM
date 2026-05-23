module.exports = {
  apps: [
    {
      name: 'deliveryguard-pm',
      script: 'node_modules/.bin/next',
      args: 'start --port 3000',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_SUPABASE_URL: 'https://czfnmvmcavenlxvyfkim.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Zm5tdm1jYXZlbmx4dnlma2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDA1NDgsImV4cCI6MjA5NTExNjU0OH0.QBsD8INinfVO5lbwnawghDe7wDArt_B6wGlYFcLljTA',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Zm5tdm1jYXZlbmx4dnlma2ltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU0MDU0OCwiZXhwIjoyMDk1MTE2NTQ4fQ.q2pMYBJtG6Y3Yh6rS5ahnKq4Pae0zpzGYgB1FXQncBY',
        OPENAI_API_KEY: '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',
        OPENAI_MODEL: 'gpt-4o',
        DISCORD_WEBHOOK_URL: '',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
        CRON_SECRET: 'deliveryguard-cron-2024',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
}
