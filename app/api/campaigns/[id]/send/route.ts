import { NextResponse } from "next/server";
import { assertSiteRole, requireApiAccess } from "@/src/auth/server";
import { getCampaigns, getSites, getCampaignRecipients, markCampaignSent } from "@/src/database/repositories";
import { apiErrorResponse, assertSameOrigin, HttpError } from "@/src/security/http";
import { renderCampaignEmail } from "@/src/services/email-renderer";
import { sendResendEmail } from "@/src/integrations/resend/client";
import { recordOutboundEmail } from "@/src/database/repositories";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    if (!uuid.test(id)) throw new HttpError("La campaña no es válida.");

    const access = await requireApiAccess();
    const campaign = (await getCampaigns()).find((item) => item.id === id);
    if (!campaign) throw new HttpError("No se encontró la campaña.", 404);
    
    // Check permission (approver or admin can send)
    assertSiteRole(access, campaign.siteId, ["site_admin", "approver"]);
    
    if (campaign.status !== "ready") {
      throw new HttpError("La campaña debe estar aprobada (estado: Lista) antes de ser enviada.");
    }
    
    const sites = await getSites();
    const site = sites.find((s) => s.id === campaign.siteId);
    if (!site) throw new HttpError("No se encontró la marca asociada.", 404);

    // Get recipients list (custom or segment-based)
    const recipients = await getCampaignRecipients(id);
    if (!recipients.length) {
      throw new HttpError("No hay destinatarios configurados para enviar esta campaña.");
    }

    // Render HTML content
    const items = campaign.metadata?.items ?? [];
    const html = await renderCampaignEmail(site, campaign.automationType, items as any[]);

    // Send emails in parallel or sequence
    const sender = `${site.senderName || site.name} <${site.senderEmail}>`;
    let sentCount = 0;
    let lastError = "";
    
    for (const to of recipients) {
      try {
        const result = await sendResendEmail({
          to,
          subject: campaign.subject,
          html,
          from: sender,
          siteId: site.id,
        });
        
        await recordOutboundEmail({
          resendId: result.id,
          to,
          from: site.senderEmail,
          subject: campaign.subject,
          status: "sent",
        });
        
        sentCount++;
      } catch (err) {
        console.error(`Error sending email to ${to}:`, err);
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    if (sentCount === 0) {
      throw new HttpError(lastError || "No se pudo enviar la campaña a ningún destinatario.");
    }

    // Mark as sent in DB
    const updated = await markCampaignSent(id, `broadcast-${id}`);

    return NextResponse.json({ ok: true, campaign: updated, sentCount });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo enviar la campaña.");
  }
}
