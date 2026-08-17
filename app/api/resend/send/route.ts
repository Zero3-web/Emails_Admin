import { NextResponse } from "next/server";
import { sendResendEmail } from "@/src/integrations/resend/client";
import { recordOutboundEmail } from "@/src/database/repositories";
import { assertPlatformOwner, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertEmail, assertSameOrigin, escapeHtml, readJsonObject, requiredString, singleLineString } from "@/src/security/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertPlatformOwner(await requireApiAccess());
    const body = await readJsonObject(request, 32 * 1024);
    const to = assertEmail(body.to, "El destinatario");
    const subject = singleLineString(body.subject, "El asunto", 200);
    const message = requiredString(body.message, "El mensaje", 20_000);
    const senderEmail = body.senderDomain ? assertEmail(body.senderDomain, "El remitente") : "notificaciones@areaprime.com.pe";
    const fromAddress = `Area Prime <${senderEmail}>`;
    const htmlContent = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#fff"><h2 style="color:#0f172a">Correo de prueba</h2><p><strong>Remitente:</strong> ${escapeHtml(fromAddress)}</p><p><strong>Destinatario:</strong> ${escapeHtml(to)}</p><p><strong>Asunto:</strong> ${escapeHtml(subject)}</p><div style="background:#f8fafc;padding:18px;border-left:4px solid #3b82f6;white-space:pre-wrap">${escapeHtml(message)}</div></div>`;
    const result = await sendResendEmail({ to, subject, html: htmlContent, text: message, from: fromAddress });
    await recordOutboundEmail({ resendId: result.id, to, from: fromAddress, subject, status: "sent" });
    return NextResponse.json({ ok: true, id: result.id, message: "Correo enviado correctamente." });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo procesar el envío.");
  }
}
