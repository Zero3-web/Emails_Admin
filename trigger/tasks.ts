import { getBlogProvider, getPropertyProvider } from "@/src/integrations/factory";
import { approveCampaign, createCampaignDraft, getBlogPosts, getProperties, getSites, addCampaigns } from "@/src/database/repositories";
import { createCampaign } from "@/src/services/campaigns";
import { renderCampaignEmail } from "@/src/services/email-renderer";
import { createSupabaseAdmin } from "@/src/database/supabase/server";
import { dispatchCampaign } from "@/src/services/campaign-dispatch";
import type { AutomationType, ContactInterest } from "@/src/domain/types";

export const taskNames = ["sync-properties", "sync-blog-posts", "generate-weekly-properties", "generate-monthly-properties", "generate-monthly-blog", "run-due-automations"] as const;

export function nextRun(row: { frequency: string; day_of_week: number | null; day_of_month: number | null; send_time: string }, after: Date) {
  const [hour, minute] = row.send_time.slice(0, 5).split(":").map(Number);
  const lima = new Date(after.getTime() - 5 * 60 * 60 * 1000);
  const year = lima.getUTCFullYear();
  const month = lima.getUTCMonth();
  const date = lima.getUTCDate();
  if (row.frequency === "weekly") {
    const today = lima.getUTCDay() || 7;
    const days = (Number(row.day_of_week) - today + 7) % 7;
    let candidate = new Date(Date.UTC(year, month, date + days, hour + 5, minute));
    if (candidate <= after) candidate = new Date(candidate.getTime() + 7 * 24 * 60 * 60 * 1000);
    return candidate;
  }
  let candidate = new Date(Date.UTC(year, month, Number(row.day_of_month), hour + 5, minute));
  if (candidate <= after) candidate = new Date(Date.UTC(year, month + 1, Number(row.day_of_month), hour + 5, minute));
  return candidate;
}

const automationCopy: Record<AutomationType, { name: string; subject: string; introduction: string; limit: number }> = {
  weekly_new_properties: {
    name: "Nuevas oficinas de la semana",
    subject: "Nuevas oficinas disponibles",
    introduction: "Descubre las oportunidades incorporadas recientemente.",
    limit: 5,
  },
  monthly_properties: {
    name: "Oficinas disponibles",
    subject: "Oficinas disponibles para tu empresa",
    introduction: "Una selección mensual de oficinas para hacer crecer tu negocio.",
    limit: 10,
  },
  monthly_blog: {
    name: "Novedades del blog",
    subject: "Novedades y artículos del mes",
    introduction: "Últimos contenidos publicados.",
    limit: 5,
  },
};

function interestForSlug(slug: string): ContactInterest {
  const clean = slug.toLowerCase().replace(/^area-/, "").replace(/^area/, "");
  if (clean === "prime" || clean === "areaprime") return "prime";
  if (clean === "hub" || clean === "areahub") return "hub";
  if (clean === "retail" || clean === "arearetail") return "retail";
  throw new Error(`La marca ${slug} no tiene un segmento de audiencia compatible.`);
}

async function contentIdsForAutomation(
  db: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  siteId: string,
  type: AutomationType,
  limit: number,
) {
  const table = type === "monthly_blog" ? "blog_posts" : "properties";
  const { data, error } = await db
    .from(table)
    .select("id")
    .eq("site_id", siteId)
    .not("public_url", "is", null)
    .neq("public_url", "")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const ids = (data ?? []).map((item) => String(item.id));
  if (!ids.length) throw new Error("No hay contenido público disponible para esta automatización.");
  return ids;
}

async function recordAutomationFailure(
  db: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  row: { id: string; site_id: string; type: AutomationType; requires_approval: boolean },
  scheduledFor: string,
  message: string,
) {
  const copy = automationCopy[row.type];
  const { error } = await db.from("campaigns").insert({
    site_id: row.site_id,
    automation_type: row.type,
    name: `${copy.name} · error de automatización`,
    subject: copy.subject,
    status: "failed",
    recipient_count: 0,
    scheduled_at: scheduledFor,
    error_message: message.slice(0, 500),
    metadata: {
      automation_id: row.id,
      scheduled_for: scheduledFor,
      requires_approval: row.requires_approval,
    },
  });
  if (error && error.code !== "23505") throw error;
}

export async function runDueAutomations(now = new Date()) {
  const db = createSupabaseAdmin();
  if (!db) throw new Error("La base de datos no está configurada.");
  const { data, error } = await db.from("automation_settings")
    .select("id,site_id,type,frequency,day_of_week,day_of_month,send_time,requires_approval,next_run_at,sites!inner(name,slug)")
    .eq("is_enabled", true);
  if (error) throw error;
  let created = 0;
  let failed = 0;
  const autoSendCampaignIds: string[] = [];
  for (const row of data ?? []) {
    const scheduled = row.next_run_at ? new Date(row.next_run_at) : nextRun(row, new Date(now.getTime() - 10 * 60 * 1000));
    const following = nextRun(row, now);
    if (scheduled > now) {
      if (!row.next_run_at) await db.from("automation_settings").update({ next_run_at: scheduled.toISOString() }).eq("id", row.id).is("next_run_at", null);
      continue;
    }
    const site = Array.isArray(row.sites) ? row.sites[0] : row.sites;
    const scheduledFor = scheduled.toISOString();
    try {
      const copy = automationCopy[row.type as AutomationType];
      const itemIds = await contentIdsForAutomation(db, row.site_id, row.type as AutomationType, copy.limit);
      const campaign = await createCampaignDraft({
        siteId: interestForSlug(site?.slug ?? ""),
        type: row.type as AutomationType,
        name: `${copy.name} · ${site?.name ?? "Area Mail"}`,
        subject: `${copy.subject} · ${site?.name ?? "Area Mail"}`,
        introduction: copy.introduction,
        audienceInterest: interestForSlug(site?.slug ?? ""),
        itemIds,
        automation: { id: row.id, scheduledFor, requiresApproval: row.requires_approval },
      });
      created += 1;
      if (!row.requires_approval) {
        await approveCampaign(campaign.id, `automation:${row.id}`);
        try {
          await dispatchCampaign(campaign.id);
        } catch (dispatchErr) {
          console.error("Error al despachar campaña automática:", dispatchErr);
        }
        autoSendCampaignIds.push(campaign.id);
      }
    } catch (cause) {
      const duplicate = typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505";
      if (!duplicate) {
        failed += 1;
        await recordAutomationFailure(
          db,
          { id: row.id, site_id: row.site_id, type: row.type as AutomationType, requires_approval: row.requires_approval },
          scheduledFor,
          cause instanceof Error ? cause.message : "No se pudo preparar la automatización.",
        );
      }
    }
    const updated = await db.from("automation_settings").update({ last_run_at: now.toISOString(), next_run_at: following.toISOString() }).eq("id", row.id);
    if (updated.error) throw updated.error;
  }
  return { created, failed, checked: data?.length ?? 0, autoSendCampaignIds };
}

export async function runTask(name: (typeof taskNames)[number]) {
  if (name === "run-due-automations") return runDueAutomations();
  const sites = await getSites(); if (!sites.length) throw new Error("No hay sitios persistidos.");
  if (name === "sync-properties") return getPropertyProvider().getProperties();
  if (name === "sync-blog-posts") return Promise.all(sites.map((site) => getBlogProvider().getPosts(site)));
  const type = name === "generate-weekly-properties" ? "weekly_new_properties" : name === "generate-monthly-properties" ? "monthly_properties" : "monthly_blog";
  const generated = sites.map((site) => createCampaign(site, type));
  const content = type === "monthly_blog" ? await getBlogPosts() : await getProperties();
  const limit = type === "weekly_new_properties" ? 5 : type === "monthly_properties" ? 10 : 5;
  await Promise.all(sites.map((site) => renderCampaignEmail(site, type, content.filter((item) => item.siteId === site.id && (type === "monthly_blog" || Boolean(item.publicUrl))).slice(0, limit))));
  return addCampaigns(generated);
}
