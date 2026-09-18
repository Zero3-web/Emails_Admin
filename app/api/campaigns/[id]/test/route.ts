import { NextResponse } from "next/server";
import { assertSiteRole, requireApiAccess } from "@/src/auth/server";
import { getCampaigns, getSites } from "@/src/database/repositories";
import { apiErrorResponse, assertSameOrigin, HttpError, readJsonObject } from "@/src/security/http";
import { renderCampaignEmail } from "@/src/services/email-renderer";
import { injectEmailTracking } from "@/src/services/email-tracking";
import { sendResendEmail } from "@/src/integrations/resend/client";
import { createUnsubscribeToken, publicAppUrl } from "@/src/security/unsubscribe";
import { createSupabaseAdmin } from "@/src/database/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    if (!uuid.test(id)) throw new HttpError("La campaña no es válida.");

    const input = (await readJsonObject(request)) as any;
    const to = input.to as string;
    if (!to || !to.includes("@")) {
      throw new HttpError("La dirección de correo de prueba no es válida.");
    }

    const access = await requireApiAccess();
    const campaign = (await getCampaigns()).find((item) => item.id === id);
    if (!campaign) throw new HttpError("No se encontró la campaña.", 404);
    
    // Check permission (approver or admin can send test)
    assertSiteRole(access, campaign.siteId, ["site_admin", "editor", "approver"]);
    
    const sites = await getSites();
    const site = sites.find((s) => s.id === campaign.siteId);
    if (!site) throw new HttpError("No se encontró la marca asociada.", 404);

    // Render HTML content with working unsubscribe URL
    const baseUrl = publicAppUrl();
    const items = campaign.metadata?.items ?? [];
    const cleanTo = to.toLowerCase().trim();
    const token = createUnsubscribeToken({ email: cleanTo, siteId: site.id });
    const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;
    const rawHtml = await renderCampaignEmail(site, campaign.automationType, items as any[], { unsubscribeUrl });

    const testOutboundId = crypto.randomUUID();
    const trackedHtml = injectEmailTracking(rawHtml, testOutboundId, baseUrl);

    // Send single test email
    const sender = `${site.senderName || site.name} <${site.senderEmail}>`;
    const result = await sendResendEmail({
      to,
      subject: `[PRUEBA] ${campaign.subject}`,
      html: trackedHtml,
      from: sender,
      siteId: site.id,
    });

    const db = createSupabaseAdmin();
    if (db && result.id) {
      const testRecord: Record<string, unknown> = {
        id: testOutboundId,
        campaign_id: id,
        site_id: site.id,
        resend_email_id: result.id,
        recipient: to,
        sender: site.senderEmail || sender,
        subject: `[PRUEBA] ${campaign.subject}`,
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: { html: trackedHtml, is_test: true, user_id: access.user.id },
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
