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
      if (val && val.trim() !== "" && val !== "re_tu_api_key_aqui") return val.trim();
    }
  }

  const defaultKey = process.env.RESEND_API_KEY || process.env.RESEND_API_KEY_AREA_PRIME || process.env.RESEND_API_KEY_PRIME;
  if (!defaultKey || defaultKey === "re_tu_api_key_aqui") {
    throw new Error("Integración de Resend no configurada. Configura RESEND_API_KEY en .env o .env.local");
  }
  return defaultKey.trim();
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
};

export async function sendResendEmail({
  to,
  subject,
  html,
  text,
  from,
  siteId,
  headers,
}: SendEmailParams) {
  const apiKey = requireResendKey(siteId);
  const sender = from && from.includes("@") && !from.includes("<>") ? from : getDefaultSenderForSite(siteId);

  let response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [to],
      subject,
      html: html ?? (text ? `<p>${text}</p>` : "<p></p>"),
      text,
      headers,
    }),
  });

  if (!response.ok) {
    const rawText = await response.text();
    // Fallback: If custom domain is not yet verified in Resend, retry with Resend testing domain
    if (rawText.includes("not verified") || rawText.includes("onboarding@resend.dev")) {
      console.warn(`[Resend] Domain unverified for ${sender}. Retrying with onboarding@resend.dev`);
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Area Mail <onboarding@resend.dev>",
          to: [to],
          subject,
          html: html ?? (text ? `<p>${text}</p>` : "<p></p>"),
          text,
          headers,
        }),
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      let errorMessage = `Resend HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.message) errorMessage = parsed.message;
        else if (parsed.error) errorMessage = typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
      } catch {
        // Ignore JSON parsing errors and use default fallback message
      }
      console.error(`[Resend Error ${response.status}]:`, errText);
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
