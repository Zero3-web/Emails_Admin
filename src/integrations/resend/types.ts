export type BroadcastInput = {
  name: string;
  subject: string;
  html: string;
  segmentId?: string;
};
export interface MarketingEmailProvider {
  createBroadcast(input: BroadcastInput): Promise<{ id: string }>;
  sendBroadcast(id: string): Promise<void>;
  scheduleBroadcast(id: string, at: Date): Promise<void>;
  sendTest(input: BroadcastInput, to: string): Promise<void>;
  getBroadcast(id: string): Promise<{ id: string; status: string }>;
}
