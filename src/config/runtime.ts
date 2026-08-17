export type RuntimeEnvironment = "development" | "production";

export function getRuntimeSafety() {
  const environment: RuntimeEnvironment = process.env.APP_ENV === "production" ? "production" : "development";
  const bulkSendingEnabled = environment === "production" && process.env.ENABLE_BULK_SEND === "true";
  return { environment, bulkSendingEnabled };
}

export function assertBulkSendingAllowed() {
  if (!getRuntimeSafety().bulkSendingEnabled) throw new Error("Los envíos masivos están bloqueados en este entorno.");
}
