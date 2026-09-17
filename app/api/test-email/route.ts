import { NextResponse } from "next/server";
import { assertSameOrigin, assertEmail, assertSiteKey, readJsonObject, apiErrorResponse } from "@/src/security/http";
import { getDefaultSenderForSite, sendResendEmail } from "@/src/integrations/resend/client";
import { assertSiteRole, requireApiAccess } from "@/src/auth/server";
import { enforceRateLimit } from "@/src/security/rate-limit";
import { createSupabaseAdmin } from "@/src/database/supabase/server";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "site-test-email", 10, 60);
    const body = await readJsonObject(request);
    const to = assertEmail(body.to, "El correo destinatario");
    const siteId = assertSiteKey(body.siteId);
    const access = await requireApiAccess();
    assertSiteRole(access, siteId, ["site_admin"]);

    const testHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #0f172a;">
          <h2 style="color: #4f46e5; margin-top: 0; font-size: 20px;">¡Prueba de envío exitosa!</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.5;">Este es un correo de prueba enviado exitosamente desde la consola de administración de <strong>Área Mail</strong>.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="color: #64748b; font-size: 12px; margin: 0;">Servidor de correos verificado y activo. Destinatario: <strong>${to}</strong></p>
        </div>
      `;

    const result = await sendResendEmail({
      to,
      siteId,
      from: getDefaultSenderForSite(siteId),
      subject: "🧪 Correo de prueba de Servidor de Envíos — Área Mail",
      html: testHtml,
    });

    const db = createSupabaseAdmin();
    if (db && result.id) {
      const testRecord: Record<string, unknown> = {
        site_id: siteId,
        resend_email_id: result.id,
        recipient: to,
        sender: getDefaultSenderForSite(siteId),
        subject: "🧪 Correo de prueba de Servidor de Envíos — Área Mail",
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: { html: testHtml, is_test: true, user_id: access.user.id },
        user_id: access.user.id,
      };
      const saved = await db.from("outbound_emails").upsert(testRecord, { onConflict: "resend_email_id" });
      if (saved.error && (saved.error.code === "42703" || saved.error.message?.includes("user_id"))) {
        delete testRecord.user_id;
        await db.from("outbound_emails").upsert(testRecord, { onConflict: "resend_email_id" });
      }
    }

    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo enviar el correo de prueba.");
  }
}
