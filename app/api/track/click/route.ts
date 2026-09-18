import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/database/supabase/server";
import { isValidTrackingUrl } from "@/src/services/email-tracking";
import { publicAppUrl } from "@/src/security/unsubscribe";

export async function GET(request: Request) {
  let destinationUrl = "";

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const rawUrl = searchParams.get("url");

    if (rawUrl && isValidTrackingUrl(rawUrl)) {
      destinationUrl = rawUrl.trim();
    }

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
          const resendEmailId = outbound.resend_email_id || cleanId;
          const userAgent = request.headers.get("user-agent");
          const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");

          // 1. Record email.clicked event in email_events
          const clickEventId = `click_${outbound.id || cleanId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          await db.from("email_events").insert({
            resend_event_id: clickEventId,
            resend_email_id: resendEmailId,
            event_type: "email.clicked",
            occurred_at: now,
            payload: {
              url: destinationUrl,
              source: "area_mail_click_redirect",
              user_agent: userAgent,
              ip,
            },
          });

          // 2. Also ensure open is recorded if not opened yet
          if (outbound.status !== "opened" && outbound.status !== "clicked") {
            const openEventId = `open_${outbound.id || cleanId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            await db.from("email_events").insert({
              resend_event_id: openEventId,
              resend_email_id: resendEmailId,
              event_type: "email.opened",
              occurred_at: now,
              payload: {
                source: "area_mail_click_implied_open",
                user_agent: userAgent,
                ip,
              },
            });
          }

          // 3. Update status to clicked in outbound_emails
          await db
            .from("outbound_emails")
            .update({
              status: "clicked",
              last_event_at: now,
            })
            .eq("id", outbound.id);
        }
      }
    }
  } catch (error) {
    console.error("[Track Click Error]:", error);
  }

  // Redirect to destination URL if valid, otherwise back to home
  const finalRedirect = destinationUrl || publicAppUrl() || "/";
  return NextResponse.redirect(finalRedirect, 302);
}
