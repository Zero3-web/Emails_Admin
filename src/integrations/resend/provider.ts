import { requireResendKey, sendResendEmail } from "./client";
import type { BroadcastInput, MarketingEmailProvider } from "./types";

export class ResendEmailProvider implements MarketingEmailProvider {
  private unavailable(): never {
    requireResendKey();
    throw new Error("Operación de Resend no soportada aún");
  }

  async createBroadcast(_input: BroadcastInput) {
    requireResendKey();
    return { id: `resend-broadcast-${Date.now()}` };
  }

  async sendBroadcast(_id: string) {
    this.unavailable();
  }

  async scheduleBroadcast(_id: string, _at: Date) {
    this.unavailable();
  }

  async sendTest(input: BroadcastInput, to: string) {
    await sendResendEmail({
      to,
      subject: input.subject,
      html: input.html,
    });
  }

  async getBroadcast(id: string) {
    requireResendKey();
    return { id, status: "draft" };
  }
}
