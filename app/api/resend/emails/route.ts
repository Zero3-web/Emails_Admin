import { NextResponse } from "next/server";
import { getOutboundEmails } from "@/src/database/repositories";
import { assertPlatformOwner, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse } from "@/src/security/http";
import { getResendEmailStatus } from "@/src/integrations/resend/client";
import { createSupabaseAdmin } from "@/src/database/supabase/server";

export async function GET() {
  try {
    assertPlatformOwner(await requireApiAccess());
    const emails = await getOutboundEmails();

    // Sync live status with Resend API for recent sent/pending emails
    const pendingEmails = emails.filter((e) => ["sent", "queued", "delivery_delayed"].includes(e.status)).slice(0, 15);
    const db = createSupabaseAdmin();

    if (pendingEmails.length > 0 && db) {
      await Promise.all(
        pendingEmails.map(async (email) => {
          try {
            const resendData = await getResendEmailStatus(email.id);
            const liveStatus = resendData.last_event || (resendData as any).status;
            if (liveStatus && liveStatus !== email.status) {
              await db
                .from("outbound_emails")
                .update({ status: liveStatus, last_event_at: new Date().toISOString() })
                .eq("resend_email_id", email.id);
              email.status = liveStatus;
            }
          } catch {
            // Ignore individual Resend API lookup errors
          }
        })
      );
    }

    return NextResponse.json({ ok: true, emails });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo consultar el historial.");
  }
}
