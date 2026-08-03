module.exports = {
  apps: [
    {
      name: 'time-tracker',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3000',
      instances: 5,
      exec_mode: 'cluster',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Restart on memory threshold
      max_memory_restart: '1G',
      // Log configuration
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
