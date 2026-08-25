export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { startAutomationScheduler } = await import("./src/services/automation-runner");
      startAutomationScheduler();
    } catch (err) {
      console.error("[Instrumentation] No se pudo iniciar el programador:", err);
    }
  }
}
