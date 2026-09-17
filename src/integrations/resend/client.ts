import { readLimitedJson } from "@/src/security/outbound";

export function requireResendKey(siteId?: string) {
  if (siteId) {
    const cleanId = siteId.toLowerCase().replace(/^area-?/, "").replace(/[^a-z0-9]/g, "");
    const candidates = [
      `RESEND_API_KEY_AREA_${cleanId.toUpperCase()}`,
      `RESEND_API_KEY_${cleanId.toUpperCase()}`,
      `RESEND_API_KEY_${siteId.toLowerCase().replace(/^area/, "").toUpperCase()}`,
      `RESEND_API_KEY-${siteId.toLowerCase()}`,
    ];
    for (const name of candidates) {
      const val = process.env[name];
      if (val && val.trim() !== "" && val !== "re_tu_api_key_aqui") {
        return val.replace(/[\r\n\0]/g, "").trim();
      }
    }
  }

  const defaultKey = process.env.RESEND_API_KEY || process.env.RESEND_API_KEY_AREA_PRIME || process.env.RESEND_API_KEY_PRIME;
  if (!defaultKey || defaultKey === "re_tu_api_key_aqui") {
    throw new Error("Integración de Resend no configurada. Configura RESEND_API_KEY en .env o .env.local");
  }
  return defaultKey.replace(/[\r\n\0]/g, "").trim();
}

export function getDefaultSenderForSite(siteId?: string): string {
  if (!siteId) return "Area Prime <novedades@areaprime.com.pe>";
  const clean = siteId.toLowerCase().replace(/^area-?/, "");
  if (clean === "hub" || clean === "areahub") {
    return "Area Hub <novedades@areahub.pe>";
  }
  if (clean === "retail" || clean === "arearetail") {
    return "Area Retail <novedades@arearetail.pe>";
  }
  return "Area Prime <novedades@areaprime.com.pe>";
}

export type SendEmailParams = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  siteId?: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
};

export async function sendResendEmail({
  to,
  subject,
  html,
  text,
  from,
  siteId,
  headers,
  idempotencyKey,
}: SendEmailParams) {
  const apiKey = requireResendKey(siteId).replace(/[\r\n\0]/g, "").trim();
  const rawSender = from && from.includes("@") && !from.includes("<>") ? from : getDefaultSenderForSite(siteId);
  const sender = rawSender.replace(/[\r\n\0]/g, "").trim();
  const cleanSubject = subject.replace(/[\r\n\0]/g, " ").trim();
  const cleanTo = to.replace(/[\r\n\0]/g, "").trim();

  const cleanHeaders: Record<string, string> = {};
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      const k = key.replace(/[\r\n\0]/g, "").trim();
      const v = String(value).replace(/[\r\n\0]/g, "").trim();
      if (k && v) cleanHeaders[k] = v;
    }
  }

  const payloadHeaders = Object.keys(cleanHeaders).length > 0 ? cleanHeaders : undefined;

  let response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: sender,
      to: [cleanTo],
      subject: cleanSubject,
      html: html ?? (text ? `<p>${text}</p>` : "<p></p>"),
      text,
      headers: payloadHeaders,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const rawText = await response.text();
    // Fallback: If custom domain is not yet verified in Resend, retry with verified areaprime domain
    if (rawText.includes("not verified") || rawText.includes("resend.com/domains") || rawText.includes("onboarding@resend.dev")) {
      const brandName = sender.includes("<") ? sender.split("<")[0].trim() : "Area Mail";
      const fallbackSender = `${brandName} <novedades@areaprime.com.pe>`;
      console.warn(`[Resend] Domain unverified for ${sender}. Retrying with verified domain sender: ${fallbackSender}`);
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify({
          from: fallbackSender,
          to: [cleanTo],
          subject: cleanSubject,
          html: html ?? (text ? `<p>${text}</p>` : "<p></p>"),
          text,
          headers: payloadHeaders,
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) {
        const retryErrText = await response.text();
        let errorMessage = `Resend HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(retryErrText);
          if (parsed.message) errorMessage = parsed.message;
          else if (parsed.error) errorMessage = typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
        } catch {
          // Ignore JSON parsing errors
        }
        console.error(`[Resend Error ${response.status}]:`, retryErrText);
        throw new Error(`Resend API: ${errorMessage}`);
      }
    } else {
      let errorMessage = `Resend HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(rawText);
        if (parsed.message) errorMessage = parsed.message;
        else if (parsed.error) errorMessage = typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
      } catch {
        // Ignore JSON parsing errors
      }
      console.error(`[Resend Error ${response.status}]:`, rawText);
      throw new Error(`Resend API: ${errorMessage}`);
    }
  }

  const payload = (await readLimitedJson(response, 128 * 1024)) as { id?: string };
  if (!payload.id) {
    throw new Error("Resend API no devolvió un identificador de correo válido.");
  }
  return { id: payload.id };
}

export async function getResendEmailStatus(emailId: string, siteId?: string) {
  const apiKey = requireResendKey(siteId);
  const response = await fetch(`https://api.resend.com/emails/${emailId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch email status from Resend: HTTP ${response.status}`);
  }
  return response.json();
}

export async function getResendEmailsList(siteId?: string) {
  try {
    const apiKey = requireResendKey(siteId);
    const response = await fetch("https://api.resend.com/emails?limit=100", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { data?: Array<{ id: string; to: string[]; from: string; subject: string; created_at: string; last_event?: string; status?: string }> };
    return Array.isArray(data.data) ? data.data : [];
  } catch {
    return [];
  }
}
