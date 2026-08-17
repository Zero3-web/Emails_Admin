import { readLimitedJson } from "@/src/security/outbound";

export function requireResendKey() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_tu_api_key_aqui") {
    throw new Error("Resend integration not configured. Configura RESEND_API_KEY en .env o .env.local");
  }
  return key;
}

export type SendEmailParams = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

export async function sendResendEmail({
  to,
  subject,
  html,
  text,
  from,
}: SendEmailParams) {
  const apiKey = requireResendKey();
  const sender = from || "Area Prime <notificaciones@areaprime.com.pe>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [to],
      subject,
      ...(html ? { html } : { text: text || "" }),
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const data = await readLimitedJson<{ id?: string; message?: string; error?: { message?: string } }>(response, 256 * 1024);

  if (!response.ok) {
    throw new Error(
      data.message || data.error?.message || `Error al enviar correo con Resend (${response.status})`
    );
  }

  if (!data.id) throw new Error("Resend no devolvió un identificador de envío.");
  return { id: data.id };
}

export async function getResendEmailStatus(id: string) {
  const apiKey = requireResendKey();

  const response = await fetch(`https://api.resend.com/emails/${id}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  const data = await readLimitedJson<{
    id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    last_event: string;
    html?: string;
    message?: string;
    error?: { message?: string };
  }>(response, 512 * 1024);

  if (!response.ok) {
    throw new Error(
      data.message || data.error?.message || `Error al consultar estado de correo (${response.status})`
    );
  }

  return data;
}
