import { getBiometricConfig, runBiometricImport } from "./biometric";

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let lastPollAt = 0;

/**
 * Poll the biometric source on the configured interval (started via instrumentation).
 * Re-reads config every tick so settings changes apply without a restart.
 */
export function startBiometricPolling() {
  if (timer) return;
  const tick = async () => {
    if (running) return;
    try {
      const cfg = await getBiometricConfig();
      if (!cfg.enabled || !cfg.sourceUrl) return;
      const intervalMs = cfg.pollIntervalMinutes * 60_000;
      const now = Date.now();
      if (lastPollAt !== 0 && now - lastPollAt < intervalMs) return;
      lastPollAt = now;
      running = true;
      await runBiometricImport();
    } catch (error) {
      console.error("Biometric poll failed:", error);
      try {
        const { prisma } = await import("./prisma");
        await prisma.biometricConfig.update({
          where: { id: 1 },
          data: { lastRunStatus: "error", lastRunMessage: String((error as Error)?.message || "Unknown error") },
        });
      } catch {
        // ignore secondary failure
      }
    } finally {
      running = false;
    }
  };

  timer = setInterval(tick, 60_000);
  tick();
}
