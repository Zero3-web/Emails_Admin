import { runDueAutomations } from "@/trigger/tasks";

let isRunning = false;
let intervalHandle: NodeJS.Timeout | null = null;

export function startAutomationScheduler() {
  if (intervalHandle) return;

  console.log("[Scheduler] 🚀 Iniciando programador de automatizaciones en segundo plano (cada 20s)...");

  // Run initial check after 3 seconds
  setTimeout(async () => {
    try {
      await checkAndRun();
    } catch (err) {
      console.error("[Scheduler] Error en chequeo inicial:", err);
    }
  }, 3000);

  // Interval check every 20 seconds
  intervalHandle = setInterval(async () => {
    await checkAndRun();
  }, 20_000);
}

async function checkAndRun() {
  if (isRunning) return;
  isRunning = true;
  try {
    const result = await runDueAutomations(new Date());
    if (result && result.created > 0) {
      console.log(`[Scheduler] ✅ Se ejecutaron ${result.created} automatizaciones vencidas.`);
    }
  } catch (err) {
    console.error("[Scheduler] Error ejecutando automatizaciones vencidas:", err);
  } finally {
    isRunning = false;
  }
}
