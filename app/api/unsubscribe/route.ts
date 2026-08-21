import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/database/supabase/server";
import { enforceRateLimit } from "@/src/security/rate-limit";
import { verifyUnsubscribeToken } from "@/src/security/unsubscribe";

function page(message: string, action?: string) {
  return new NextResponse(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preferencias de correo</title><body style="margin:0;background:#f5f6f3;font-family:Arial,sans-serif;color:#20231f"><main style="max-width:460px;margin:12vh auto;padding:32px;border:1px solid #dfe3da;border-radius:18px;background:#fff;text-align:center"><div style="display:inline-grid;width:48px;height:48px;place-items:center;border-radius:14px;background:#c6ff00;font-weight:800">AM</div><h1 style="font-size:24px">Preferencias de correo</h1><p style="color:#667066;line-height:1.6">${message}</p>${action ?? ""}</main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" } });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!verifyUnsubscribeToken(token)) return page("El enlace no es válido o está incompleto.");
  return page("Confirma que ya no deseas recibir comunicaciones de esta marca.", `<form method="post"><input type="hidden" name="token" value="${token.replace(/[&<>"]/g, "")}"><button style="min-height:44px;padding:0 20px;border:0;border-radius:10px;background:#20231f;color:#fff;font-weight:700;cursor:pointer">Cancelar suscripción</button></form>`);
}

export async function POST(request: Request) {
  await enforceRateLimit(request, "unsubscribe", 20, 60);
  const contentType = request.headers.get("content-type") ?? "";
  let token = "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    token = String((await request.formData()).get("token") ?? "");
  } else {
    token = new URL(request.url).searchParams.get("token") ?? "";
  }
  const payload = verifyUnsubscribeToken(token);
  if (!payload) return page("El enlace no es válido o está incompleto.");
  const db = createSupabaseAdmin();
  if (!db) return page("No pudimos actualizar tus preferencias. Inténtalo nuevamente.");
  const { error } = await db.from("contacts").update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() }).eq("email_normalized", payload.email);
  if (error) return page("No pudimos actualizar tus preferencias. Inténtalo nuevamente.");
  return page("Tu baja quedó registrada. No recibirás nuevas campañas.");
}
