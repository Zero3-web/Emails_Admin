import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { recordResendEvent } from "@/src/database/repositories";
import { HttpError, readTextLimited } from "@/src/security/http";

const MAX_BODY_BYTES = 256 * 1024;
const MAX_TIMESTAMP_DRIFT_SECONDS = 5 * 60;

function verify(body: string, headers: Headers) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;
  const id = headers.get("svix-id") ?? "";
  const timestamp = headers.get("svix-timestamp") ?? "";
  const timestampSeconds = Number(timestamp);
  if (!id || !Number.isInteger(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > MAX_TIMESTAMP_DRIFT_SECONDS) return false;

  try {
    const candidates = (headers.get("svix-signature") ?? "").split(" ").map((value) => value.replace(/^v1,/, "")).filter(Boolean);
    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    if (!key.length) return false;
    const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
    return candidates.some((candidate) => {
      const received = Buffer.from(candidate, "base64");
      return received.length === expected.length && timingSafeEqual(received, expected);
    });
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) throw new HttpError("Evento demasiado grande.", 413);
    const body = await readTextLimited(request, MAX_BODY_BYTES);
    if (!verify(body, request.headers)) return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    const event = JSON.parse(body) as unknown;
    if (!event || typeof event !== "object" || Array.isArray(event)) throw new HttpError("Evento inválido.");
    const value = event as { id?: unknown; type?: unknown; created_at?: unknown; data?: { email_id?: unknown } };
    if (typeof value.id !== "string" || value.id.length > 200 || typeof value.type !== "string" || value.type.length > 100) throw new HttpError("Evento inválido.");
    const createdAt = typeof value.created_at === "string" && !Number.isNaN(Date.parse(value.created_at)) ? value.created_at : new Date().toISOString();
    const emailId = typeof value.data?.email_id === "string" && value.data.email_id.length <= 200 ? value.data.email_id : undefined;
    await recordResendEvent({ id: value.id, type: value.type, createdAt, emailId, payload: event });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    const incidentId = crypto.randomUUID();
    console.error(`[${incidentId}] No se pudo procesar el webhook de Resend.`, error);
    return NextResponse.json({ error: "No se pudo procesar el evento.", incidentId }, { status: 500 });
  }
}
