import { createHmac, timingSafeEqual } from "node:crypto";

type UnsubscribePayload = { email: string; siteId: string };

function secret() {
  const value = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value || value.length < 32) {
    throw new Error("UNSUBSCRIBE_SECRET no está configurado de forma segura.");
  }
  return value;
}

export function createUnsubscribeToken(payload: UnsubscribePayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyUnsubscribeToken(token: string): UnsubscribePayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || token.length > 1_000) return null;
  const expected = createHmac("sha256", secret()).update(encoded).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<UnsubscribePayload>;
    if (typeof value.email !== "string" || !value.email.includes("@") || typeof value.siteId !== "string") return null;
    return { email: value.email.toLowerCase(), siteId: value.siteId };
  } catch {
    return null;
  }
}

export function publicAppUrl() {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/[\r\n\0]/g, "").trim().replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/[\r\n\0]/g, "").trim().replace(/\/$/, "");
  if (process.env.APP_URL) return process.env.APP_URL.replace(/[\r\n\0]/g, "").trim().replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/[\r\n\0]/g, "").trim()}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/[\r\n\0]/g, "").trim()}`;
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") {
    return "https://area-mail-admin.vercel.app";
  }
  return "http://localhost:3000";
}
