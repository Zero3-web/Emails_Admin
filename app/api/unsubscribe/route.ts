import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/database/supabase/server";
import { enforceRateLimit } from "@/src/security/rate-limit";
import { verifyUnsubscribeToken } from "@/src/security/unsubscribe";

function page(message: string, action?: string) {
  return new NextResponse(
    `<!doctype html>
<html lang="es">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preferencias de correo — Área Mail</title>
<body style="margin:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px;">
  <main style="max-width:460px;width:100%;padding:32px;border:1px solid #e2e8f0;border-radius:18px;background:#ffffff;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);text-align:center;">
    <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;background:#e0e7ff;color:#4338ca;font-size:18px;font-weight:800;margin-bottom:16px;">AM</div>
    <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#0f172a;">Preferencias de correo</h1>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 16px;">${message}</p>
    ${action ?? ""}
  </main>
</body>
</html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" } }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const emailParam = url.searchParams.get("email") ?? "";

  const payload = verifyUnsubscribeToken(token);
  const targetEmail = payload?.email || (emailParam.includes("@") ? emailParam : null);

  if (!targetEmail) {
    return page("El enlace de cancelación de suscripción no es válido o ha expirado.");
  }

  return page(
    `Confirma que deseas dar de baja a <strong>${targetEmail.replace(/[&<>"]/g, "")}</strong> de las comunicaciones de esta marca.`,
    `<form method="post" style="margin-top:20px;">
      <input type="hidden" name="email" value="${targetEmail.replace(/[&<>"]/g, "")}">
      <input type="hidden" name="token" value="${token.replace(/[&<>"]/g, "")}">
      <button style="min-height:44px;padding:0 24px;border:0;border-radius:10px;background:#ef4444;color:#ffffff;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(239,68,68,0.25);">Confirmar baja</button>
    </form>`
  );
}

export async function POST(request: Request) {
  await enforceRateLimit(request, "unsubscribe", 20, 60);
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type") ?? "";
  let token = url.searchParams.get("token") ?? "";
  let email = url.searchParams.get("email") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    if (formData.get("token")) token = String(formData.get("token"));
    if (formData.get("email")) email = String(formData.get("email"));
  }

  const payload = verifyUnsubscribeToken(token);
  const targetEmail = payload?.email || (email.includes("@") ? email : null);

  if (!targetEmail) return page("No se pudo identificar la dirección de correo a dar de baja.");

  const db = createSupabaseAdmin();
  if (db) {
    const cleanEmail = targetEmail.toLowerCase().trim();
    await db.from("contacts").update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() }).or(`email_normalized.eq.${cleanEmail},email.ilike.${cleanEmail}`);
  }

  return page(`Tu baja para <strong>${targetEmail.replace(/[&<>"]/g, "")}</strong> fue registrada exitosamente. No recibirás nuevos boletines ni promociones.`);
}
