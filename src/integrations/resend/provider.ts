import { requireResendKey } from "./client";
import type { BroadcastInput, MarketingEmailProvider } from "./types";
export class ResendEmailProvider implements MarketingEmailProvider {
  private unavailable(): never {
    requireResendKey();
    throw new Error("Resend live adapter is not configured");
  }
  async createBroadcast(_input: BroadcastInput) {
    return this.unavailable();
  }
  async sendBroadcast(_id: string) {
    this.unavailable();
  }
  async scheduleBroadcast(_id: string, _at: Date) {
    this.unavailable();
  }
  async sendTest(_input: BroadcastInput, _to: string) {
    this.unavailable();
  }
  async getBroadcast(_id: string) {
    return this.unavailable();
  }
}
