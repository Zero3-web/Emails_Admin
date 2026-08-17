import type { CampaignStatus } from "@/src/domain/types";

export type CampaignStage = "content" | "audience" | "approval" | "test" | "send";
export const campaignStages: Array<{ id: CampaignStage; label: string }> = [
  { id: "content", label: "Contenido" },
  { id: "audience", label: "Audiencia" },
  { id: "approval", label: "Aprobación" },
  { id: "test", label: "Prueba" },
  { id: "send", label: "Envío" },
];
export function getCampaignProgress(recipientCount: number, status: CampaignStatus) {
  const approved = ["ready", "scheduled", "sending", "sent"].includes(status);
  return { content: true, audience: recipientCount > 0, approval: approved, test: false, send: status === "sent" };
}
