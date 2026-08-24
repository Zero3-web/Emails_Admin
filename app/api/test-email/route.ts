import { NextResponse } from "next/server";
import { assertSameOrigin, assertEmail, readJsonObject, apiErrorResponse } from "@/src/security/http";
import { getDefaultSenderForSite, sendResendEmail } from "@/src/integrations/resend/client";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJsonObject(request);
    const to = assertEmail(body.to, "El correo destinatario");
    const siteId = typeof body.siteId === "string" ? body.siteId : undefined;

    const result = await sendResendEmail({
      to,
      siteId,
      from: getDefaultSenderForSite(siteId),
      subject: "🧪 Correo de prueba de Servidor de Envíos — Área Mail",
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #0f172a;">
          <h2 style="color: #4f46e5; margin-top: 0; font-size: 20px;">¡Prueba de envío exitosa!</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.5;">Este es un correo de prueba enviado exitosamente desde la consola de administración de <strong>Área Mail</strong>.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="color: #64748b; font-size: 12px; margin: 0;">Servidor de correos verificado y activo. Destinatario: <strong>${to}</strong></p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo enviar el correo de prueba.");
  }
}
