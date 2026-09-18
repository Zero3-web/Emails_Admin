import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/database/supabase/server";

// 1x1 transparent GIF (43 bytes)
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

const GIF_HEADERS = {
  "Content-Type": "image/gif",
  "Content-Length": "43",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id && id.trim()) {
      const cleanId = id.trim();
      const db = createSupabaseAdmin();

      if (db) {
        const { data: outbound } = await db
          .from("outbound_emails")
          .select("id, resend_email_id, status")
          .or(`id.eq.${cleanId},resend_email_id.eq.${cleanId}`)
          .limit(1)
          .maybeSingle();

        if (outbound) {
          const now = new Date().toISOString();
          const eventId = `open_${outbound.id || cleanId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const resendEmailId = outbound.resend_email_id || cleanId;

          // 1. Record email.opened event in email_events
          await db.from("email_events").insert({
            resend_event_id: eventId,
            resend_email_id: resendEmailId,
            event_type: "email.opened",
            occurred_at: now,
            payload: {
              source: "area_mail_pixel",
              user_agent: request.headers.get("user-agent"),
              ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
            },
          });

          // 2. Update status in outbound_emails if not already clicked
          if (outbound.status === "sent" || outbound.status === "delivered") {
            await db
              .from("outbound_emails")
              .update({
                status: "opened",
                last_event_at: now,
              })
              .eq("id", outbound.id);
          }
        }
      }
    }
  } catch (error) {
    // Fail gracefully: tracking errors must never break the image render
    console.error("[Track Open Error]:", error);
  }

  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: GIF_HEADERS,
  });
}
