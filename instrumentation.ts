export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBiometricPolling } = await import("./lib/biometricJob");
    startBiometricPolling();
  }
}
