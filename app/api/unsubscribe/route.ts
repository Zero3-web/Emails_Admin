import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/database/supabase/server";
import { enforceRateLimit } from "@/src/security/rate-limit";
import { verifyUnsubscribeToken } from "@/src/security/unsubscribe";

function page(title: string, message: string, brandName?: string, action?: string) {
  return new NextResponse(
    `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — ${brandName ? `${brandName} · ` : ""}Area Mail</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .unsub-card {
      max-width: 480px;
      width: 100%;
      padding: 36px 32px;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      background: #ffffff;
      box-shadow: 0 10px 30px -5px rgba(0,0,0,0.06);
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: #eef2ff;
      color: #4f46e5;
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 10px;
      letter-spacing: -0.02em;
    }
    p {
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .btn-danger {
      display: inline-block;
      min-height: 44px;
      padding: 12px 28px;
      border: 0;
      border-radius: 10px;
      background: #ef4444;
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(239,68,68,0.25);
      transition: background 0.15s ease;
    }
    .btn-danger:hover {
      background: #dc2626;
    }
    .brand-sub {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 24px;
      border-top: 1px solid #f1f5f9;
      padding-top: 16px;
    }
  </style>
</head>
<body>
  <main class="unsub-card">
    <div class="badge">AM</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${action ?? ""}
    <div class="brand-sub">${brandName ? `Comunicaciones de ${brandName}` : "Área Mail Platform"}</div>
  </main>
</body>
</html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" } }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const payload = verifyUnsubscribeToken(token);
  const targetEmail = payload?.email ?? null;

  if (!targetEmail) {
    return page(
      "Enlace no válido",
      "El enlace de cancelación de suscripción no es válido o ha expirado. Si necesitas ayuda, comunícate con nosotros directamente."
    );
  }

  let brandName = "nuestra plataforma";
  if (payload?.siteId) {
    const db = createSupabaseAdmin();
    if (db) {
      const { data: s } = await db.from("sites").select("name").or(`id.eq.${payload.siteId},slug.eq.${payload.siteId}`).maybeSingle();
      if (s?.name) brandName = s.name;
    }
  }

  return page(
    "Preferencias de correo",
    `Confirma que deseas dar de baja a <strong>${targetEmail.replace(/[&<>"]/g, "")}</strong> de las comunicaciones de <strong>${brandName}</strong>.`,
    brandName,
    `<form method="post">
      <input type="hidden" name="email" value="${targetEmail.replace(/[&<>"]/g, "")}">
      <input type="hidden" name="token" value="${token.replace(/[&<>"]/g, "")}">
      <button class="btn-danger" type="submit">Confirmar baja</button>
    </form>`
  );
}

export async function POST(request: Request) {
  await enforceRateLimit(request, "unsubscribe", 20, 60);
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type") ?? "";
  let token = url.searchParams.get("token") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    if (formData.get("token")) token = String(formData.get("token"));
  }

  const payload = verifyUnsubscribeToken(token);
  const targetEmail = payload?.email ?? null;

  if (!targetEmail) {
    return page("Error", "No se pudo identificar la dirección de correo a dar de baja.");
  }

  let brandName = "nuestra plataforma";
  const db = createSupabaseAdmin();
  if (!db) return page("Error", "No se pudo procesar la baja en este momento.");
  if (db && payload?.siteId) {
    const cleanEmail = targetEmail.toLowerCase().trim();
    const { data: site, error: siteError } = await db.from("sites").select("id,name").or(`id.eq.${payload.siteId},slug.eq.${payload.siteId}`).maybeSingle();
    if (siteError || !site) return page("Error", "No se pudo identificar la marca de este enlace.");
    brandName = site.name;
    const { data: contact, error: contactError } = await db.from("contacts").select("id").eq("email_normalized", cleanEmail).maybeSingle();
    if (contactError) return page("Error", "No se pudo procesar la baja en este momento.");
    if (contact) {
      const removed = await db.from("contact_subscriptions").delete().eq("contact_id", contact.id).eq("site_id", site.id);
      if (removed.error) return page("Error", "No se pudo procesar la baja en este momento.");
      const remaining = await db.from("contact_subscriptions").select("contact_id", { count: "exact", head: true }).eq("contact_id", contact.id);
      if (remaining.error) return page("Error", "No se pudo confirmar la baja en este momento.");
      if ((remaining.count ?? 0) === 0) {
        const updated = await db.from("contacts").update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() }).eq("id", contact.id);
        if (updated.error) return page("Error", "No se pudo confirmar la baja en este momento.");
      }
    }
  }

  return page(
    "Baja confirmada",
    `Tu correo <strong>${targetEmail.replace(/[&<>"]/g, "")}</strong> ha sido dado de baja exitosamente. No volverás a recibir boletines ni alertas de esta marca.`,
    brandName
  );
}
