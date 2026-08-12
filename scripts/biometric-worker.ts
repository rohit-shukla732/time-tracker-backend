import { startBiometricPolling } from "../lib/biometricJob";

/**
 * Standalone biometric polling worker.
 *
 * Runs the same polling loop that used to live inside the Next.js process
 * (instrumentation.ts). Running it as its own process means:
 *  - exactly one poller regardless of how many web app instances exist,
 *  - polling doesn't hold web server processes hostage,
 *  - restarts/health of the poller are independent of the app.
 *
 * Every poll re-applies attendance (re-evaluates biometric-marked days with
 * the newest punch data; manual overrides and approved leaves are kept), so
 * late-arriving punches correct statuses automatically.
 *
 * Start it with `npm run worker:biometric` (dev) or via PM2
 * (ecosystem.config.js -> app "biometric-worker", production).
 */
startBiometricPolling();
console.log("[biometric-worker] started (poll interval comes from BiometricConfig)");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[biometric-worker] received ${signal}, shutting down`);
    process.exit(0);
  });
}
