module.exports = {
  apps: [
    {
      name: 'time-tracker',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3000',
      instances: 2,
      exec_mode: 'cluster',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Restart on memory threshold
      max_memory_restart: '1G',
      // Crash / reboot recovery
      autorestart: true,             // restart on crash
      restart_delay: 3000,           // wait 3s between restarts
      max_restarts: 10,              // give up after 10 rapid crashes
      min_uptime: '10s',             // only counts as a "start" if it survived 10s
      exp_backoff_restart_delay: 100, // exponential backoff (100ms→4s+) on repeated crashes
      kill_timeout: 10000,           // wait 10s for graceful shutdown on reload/restart
      // Log configuration
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
