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
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
}
