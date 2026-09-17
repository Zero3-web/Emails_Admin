import { createSupabaseAdmin } from "@/src/database/supabase/server";
import { assertBulkSendingAllowed } from "@/src/config/runtime";
import { getDefaultSenderForSite, sendResendEmail } from "@/src/integrations/resend/client";
import { renderCampaignEmail } from "@/src/services/email-renderer";
import type { AutomationType, BlogPost, Campaign, Property, Site } from "@/src/domain/types";
import { createUnsubscribeToken, publicAppUrl } from "@/src/security/unsubscribe";
import { createHash } from "node:crypto";
import { normalizeRecipients, selectPendingRecipients } from "@/src/services/dispatch-policy";

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
  const frozenRecipients = (audience as { recipients?: unknown } | undefined)?.recipients;
  if (Array.isArray(frozenRecipients)) {
    return normalizeRecipients(frozenRecipients.filter((value): value is string => typeof value === "string"));
  }
  const customRecipients = (audience as { customRecipients?: unknown } | undefined)?.customRecipients;
  if (Array.isArray(customRecipients) && customRecipients.length > 0) {
    const valid = customRecipients.filter((value): value is string => typeof value === "string" && value.includes("@"));
    if (valid.length > 0) return [...new Set(valid)];
  }

  if (audience?.interest) {
    const { data, error } = await db
      .from("contact_subscriptions")
      .select("contacts!inner(email,status)")
      .eq("site_id", campaign.site_id)
      .eq("interest", audience.interest)
      .eq("contacts.status", "active");
    if (error) throw error;
    if (data && data.length > 0) {
      const list = [...new Set((data ?? []).flatMap((row) => {
        const contacts = Array.isArray(row.contacts) ? row.contacts : [row.contacts];
        return contacts.map((contact) => contact?.email).filter((email): email is string => typeof email === "string" && email.includes("@"));
      }))];
      if (list.length > 0) return list;
    }
  }

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
  if (campaign.status === "sent" || campaign.status === "sending") return { sentCount: 0, skipped: true };
  if (campaign.status !== "ready") throw new Error("La campaña no está lista para enviar.");

  const site = mapSite(campaign.sites);
  const recipients = await recipientsFor(db, campaign);
  if (!recipients.length) throw new Error("La campaña no tiene destinatarios elegibles.");
  if (recipients.length > 5) assertBulkSendingAllowed();

  const claim = await db.rpc("claim_campaign_dispatch", { p_campaign_id: campaignId });
  if (claim.error) throw claim.error;
  if (!claim.data) return { sentCount: 0, skipped: true };

  let sentCount = 0;

  try {
    const previous = await db.from("outbound_emails").select("recipient").eq("campaign_id", campaignId);
    if (previous.error) throw previous.error;
    const targetRecipients = selectPendingRecipients(recipients, (previous.data ?? []).map((row) => String(row.recipient)));
    const items = (campaign.metadata?.items ?? []) as unknown as Array<Property | BlogPost>;
    const cleanSubject = campaign.subject.replace(/[\r\n\0]/g, " ").trim();
    const validSenderEmail = site.senderEmail && site.senderEmail.includes("@") ? site.senderEmail.replace(/[\r\n\0]/g, "").trim() : undefined;
    const cleanSenderName = (site.senderName || site.name).replace(/[\r\n\0]/g, "").trim();
    const sender = validSenderEmail ? `${cleanSenderName} <${validSenderEmail}>` : getDefaultSenderForSite(site.id);
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
        idempotencyKey: `campaign-${campaignId}-${createHash("sha256").update(cleanTo.toLowerCase()).digest("hex")}`,
      });
      
      // Save to outbound_emails table for Activity history with user isolation
      const campaignUserId = (campaign as any).user_id || (campaign.metadata as Record<string, unknown> | undefined)?.user_id || null;
      const outboundPayload: Record<string, unknown> = {
        campaign_id: campaignId,
        site_id: campaign.site_id,
        resend_email_id: result.id,
        recipient: to,
        sender: site.senderEmail || sender,
        subject: campaign.subject,
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: { html, ...(campaignUserId ? { user_id: campaignUserId } : {}) },
      };
      if (campaignUserId) outboundPayload.user_id = campaignUserId;
      let persisted = await db.from("outbound_emails").upsert(outboundPayload, { onConflict: "resend_email_id" });
      if (persisted.error && (persisted.error.code === "42703" || persisted.error.message?.includes("user_id"))) {
        delete outboundPayload.user_id;
        persisted = await db.from("outbound_emails").upsert(outboundPayload, { onConflict: "resend_email_id" });
      }
      if (persisted.error) throw persisted.error;

      sentCount += 1;
    }

    const finished = await db.from("campaigns").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      resend_broadcast_id: `trigger-${campaignId}`,
      error_message: null,
    }).eq("id", campaignId).eq("status", "sending").select("id,status").single();
    if (finished.error) throw finished.error;

    return { sentCount, skipped: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "No se pudo entregar los correos.";
    const failed = await db.from("campaigns").update({ status: "ready", error_message: errorMsg }).eq("id", campaignId).eq("status", "sending");
    if (failed.error) console.error("No se pudo persistir el fallo de campaña:", failed.error);
    throw err;
  }
}

export async function reconcileStaleCampaigns(now = new Date()) {
  const db = createSupabaseAdmin();
  if (!db) throw new Error("La base de datos no está configurada.");
  const cutoff = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const { data: stale, error } = await db
    .from("campaigns")
    .select("id,recipient_count")
    .eq("status", "sending")
    .lt("sending_started_at", cutoff);
  if (error) throw error;
  let sent = 0;
  let failed = 0;
  for (const campaign of stale ?? []) {
    const outbound = await db.from("outbound_emails").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id);
    if (outbound.error) throw outbound.error;
    const deliveredCount = outbound.count ?? 0;
    const complete = deliveredCount >= Number(campaign.recipient_count);
    const update = await db.from("campaigns").update(complete ? {
      status: "sent",
      sent_at: now.toISOString(),
      error_message: null,
    } : {
      status: "failed",
      error_message: `Envío interrumpido: ${deliveredCount}/${campaign.recipient_count} destinatarios persistidos. Requiere revisión manual.`,
    }).eq("id", campaign.id).eq("status", "sending");
    if (update.error) throw update.error;
    if (complete) sent += 1;
    else failed += 1;
  }
  return { checked: stale?.length ?? 0, sent, failed };
}
