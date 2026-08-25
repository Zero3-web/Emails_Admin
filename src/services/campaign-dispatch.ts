import { createSupabaseAdmin } from "@/src/database/supabase/server";
import { assertBulkSendingAllowed } from "@/src/config/runtime";
import { getDefaultSenderForSite, sendResendEmail } from "@/src/integrations/resend/client";
import { renderCampaignEmail } from "@/src/services/email-renderer";
import type { AutomationType, BlogPost, Campaign, Property, Site } from "@/src/domain/types";
import { createUnsubscribeToken, publicAppUrl } from "@/src/security/unsubscribe";

type CampaignRow = {
  id: string;
  site_id: string;
  automation_type: AutomationType;
  subject: string;
  status: Campaign["status"];
  recipient_count?: number;
  metadata: Campaign["metadata"];
  sites: Record<string, unknown> | Array<Record<string, unknown>>;
};

const siteKey = (slug: string) => String(slug).replace(/^area-/, "").replace(/^area/, "");

function mapSite(value: CampaignRow["sites"]): Site {
  const row = Array.isArray(value) ? value[0] : value;
  return {
    id: String(row?.id ?? ""),
    name: String(row?.name ?? ""),
    slug: String(row?.slug ?? ""),
    description: String(row?.description ?? ""),
    businessType: String(row?.business_type ?? ""),
    domain: String(row?.domain ?? ""),
    wordpressUrl: String(row?.wordpress_url ?? ""),
    logoUrl: String(row?.logo_url ?? ""),
    primaryColor: String(row?.primary_color ?? "#111827"),
    secondaryColor: String(row?.secondary_color ?? "#c6ff00"),
    senderName: String(row?.sender_name ?? row?.name ?? "Area Mail"),
    senderEmail: String(row?.sender_email ?? ""),
    timezone: String(row?.timezone ?? "America/Lima"),
    isActive: Boolean(row?.is_active),
    tokkoFilter: (row?.tokko_filter ?? {}) as Record<string, unknown>,
  };
}

async function recipientsFor(db: NonNullable<ReturnType<typeof createSupabaseAdmin>>, campaign: CampaignRow) {
  const audience = campaign.metadata?.audience;
  const customRecipients = (audience as { customRecipients?: unknown } | undefined)?.customRecipients;
  if (Array.isArray(customRecipients) && customRecipients.length > 0) {
    const valid = customRecipients.filter((value): value is string => typeof value === "string" && value.includes("@"));
    if (valid.length > 0) return [...new Set(valid)];
  }

  if (audience?.interest) {
    const { data } = await db
      .from("contact_subscriptions")
      .select("contacts!inner(email,status)")
      .eq("site_id", campaign.site_id)
      .eq("interest", audience.interest)
      .eq("contacts.status", "active");
    if (data && data.length > 0) {
      const list = [...new Set((data ?? []).flatMap((row) => {
        const contacts = Array.isArray(row.contacts) ? row.contacts : [row.contacts];
        return contacts.map((contact) => contact?.email).filter((email): email is string => typeof email === "string" && email.includes("@"));
      }))];
      if (list.length > 0) return list;
    }
  }

  // Fallback 1: fetch active contacts for site
  const { data: contactsData } = await db
    .from("contacts")
    .select("email")
    .eq("site_id", campaign.site_id)
    .eq("status", "active");

  if (contactsData && contactsData.length > 0) {
    const list = [...new Set(contactsData.map((c) => c.email).filter((e): e is string => typeof e === "string" && e.includes("@")))];
    if (list.length > 0) return list;
  }

  // No eligible recipients found in any source
  return [];
}

export async function dispatchCampaign(campaignId: string) {
  const db = createSupabaseAdmin();
  if (!db) throw new Error("La base de datos no está configurada.");

  const { data, error } = await db
    .from("campaigns")
    .select("id,site_id,automation_type,subject,status,recipient_count,metadata,sites!inner(*)")
    .eq("id", campaignId)
    .single();
  if (error) throw error;
  const campaign = data as CampaignRow;
  if (campaign.status === "sent") return { sentCount: 0, skipped: true };

  const customList = (campaign.metadata?.audience as { customRecipients?: unknown } | undefined)?.customRecipients;
  const isCustom = Array.isArray(customList) && customList.length > 0;
  if (!isCustom && Number(campaign.recipient_count) > 5) {
    assertBulkSendingAllowed();
  }

  // Set status to sending
  await db.from("campaigns").update({ status: "sending", error_message: null }).eq("id", campaignId);

  const site = mapSite(campaign.sites);
  const recipients = await recipientsFor(db, campaign);
  if (!recipients.length) throw new Error("La campaña no tiene destinatarios elegibles.");

  const previous = await db.from("outbound_emails").select("recipient").eq("campaign_id", campaignId);
  const alreadySent = new Set((previous.data ?? []).map((row) => String(row.recipient).toLowerCase()));
  
  // Ensure we send to recipients (if all pending were skipped previously, force recipients list)
  const pending = recipients.filter((email) => !alreadySent.has(email.toLowerCase()));
  const targetRecipients = pending.length > 0 ? pending : recipients;
  
  const items = (campaign.metadata?.items ?? []) as unknown as Array<Property | BlogPost>;

  const cleanSubject = campaign.subject.replace(/[\r\n\0]/g, " ").trim();
  const validSenderEmail = site.senderEmail && site.senderEmail.includes("@") ? site.senderEmail.replace(/[\r\n\0]/g, "").trim() : undefined;
  const cleanSenderName = (site.senderName || site.name).replace(/[\r\n\0]/g, "").trim();
  const sender = validSenderEmail
    ? `${cleanSenderName} <${validSenderEmail}>`
    : getDefaultSenderForSite(site.id);

  let sentCount = 0;

  try {
    for (const to of targetRecipients) {
      const cleanTo = to.replace(/[\r\n\0]/g, "").trim();
      const token = createUnsubscribeToken({ email: cleanTo, siteId: campaign.site_id });
      const rawUrl = `${publicAppUrl()}/api/unsubscribe?token=${encodeURIComponent(token)}`;
      const unsubscribeUrl = rawUrl.replace(/[\r\n\0]/g, "").trim();
      const html = await renderCampaignEmail(site, campaign.automation_type, items, { unsubscribeUrl });
      const result = await sendResendEmail({
        to: cleanTo,
        subject: cleanSubject,
        html,
        from: sender,
        siteId: site.id,
        headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      
      // Save to outbound_emails table for Activity history
      await db.from("outbound_emails").upsert({
        campaign_id: campaignId,
        site_id: campaign.site_id,
        resend_email_id: result.id,
        recipient: to,
        sender: site.senderEmail || sender,
        subject: campaign.subject,
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: { html },
      }, { onConflict: "resend_email_id" });

      sentCount += 1;
    }

    const finished = await db.from("campaigns").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      resend_broadcast_id: `trigger-${campaignId}`,
      error_message: null,
    }).eq("id", campaignId).select("id,status").single();
    if (finished.error) throw finished.error;

    return { sentCount, skipped: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "No se pudo entregar los correos.";
    await db.from("campaigns").update({ status: "ready", error_message: errorMsg }).eq("id", campaignId);
    throw err;
  }
}
