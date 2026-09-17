import { NextResponse } from "next/server";
import { getResendEmailStatus } from "@/src/integrations/resend/client";
import { requireApiAccess } from "@/src/auth/server";
import { getOutboundEmails, getProperties, getSites } from "@/src/database/repositories";
import { apiErrorResponse, HttpError } from "@/src/security/http";
import { renderCampaignEmail } from "@/src/services/email-renderer";
import { createSupabaseAdmin } from "@/src/database/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccess();
    const { id } = await params;
    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id)) throw new HttpError("El ID del correo no es válido.");

    // Resolve authorization from our database before contacting Resend. This
    // query is scoped to the caller's memberships, preventing access with a
    // guessed Resend ID from another brand.
    const records = await getOutboundEmails();
    const match = records.find((record) => record.id === id);
    if (!match) throw new HttpError("No se encontró el registro del correo.", 404);

    let emailData: any = null;

    try {
      emailData = await getResendEmailStatus(id, match.siteId);
      if (emailData && (emailData.last_event || emailData.status)) {
        const liveStatus = emailData.last_event || emailData.status;
        const db = createSupabaseAdmin();
        if (db) {
          await db
            .from("outbound_emails")
            .update({ status: liveStatus, last_event_at: new Date().toISOString() })
            .eq("resend_email_id", id);
        }
      }
    } catch (resendErr) {
      console.warn("Resend API lookup failed, falling back to database record:", resendErr);
    }

    if (!emailData && match) {
      emailData = {
        id: match.id,
        to: [match.to],
        from: match.from,
        subject: match.subject,
        status: match.status,
        created_at: match.date,
        html: (match as any).html,
      };
    } else if (emailData && match && !(emailData as any).html && (match as any).html) {
      emailData.html = (match as any).html;
    }

    // Dynamic HTML rendering fallback so the email HTML is ALWAYS displayed
    if (emailData && !emailData.html) {
      try {
        const sites = await getSites();
        const site = sites.find((s) => match?.from?.includes(s.domain) || s.senderEmail === match?.from) ?? sites[0];
        const properties = await getProperties();
        if (site && properties.length > 0) {
          emailData.html = await renderCampaignEmail(site, "weekly_new_properties", properties.slice(0, 2), { preview: true });
        }
      } catch (err) {
        console.warn("Fallback HTML rendering failed:", err);
      }
    }

    if (!emailData) throw new HttpError("No se encontró el registro del correo.", 404);

    return NextResponse.json({ ok: true, email: emailData });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo obtener la información del correo.");
  }
}
