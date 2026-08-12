export async function register() {
  // NOTE: biometric polling moved to the standalone worker process
  // (scripts/biometric-worker.ts, managed via PM2 in ecosystem.config.js).
  // Starting it here would double-poll when the app runs multiple instances.
}
