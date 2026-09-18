import { getBlogProvider, getPropertyProvider } from "@/src/integrations/factory";
import { approveCampaign, createCampaignDraft, getBlogPosts, getProperties, getSites, addCampaigns, syncTokkoProperties, syncWordPressPosts } from "@/src/database/repositories";
import { createCampaign } from "@/src/services/campaigns";
import { renderCampaignEmail } from "@/src/services/email-renderer";
import { createSupabaseAdmin } from "@/src/database/supabase/server";
import type { AutomationType, ContactInterest } from "@/src/domain/types";
import { calculateNextRunInZone } from "@/src/services/schedule";

export const taskNames = ["sync-properties", "sync-blog-posts", "generate-weekly-properties", "generate-monthly-properties", "generate-monthly-blog", "run-due-automations"] as const;

export function nextRun(row: { frequency: string; day_of_week: number | null; day_of_month: number | null; send_time: string }, after: Date) {
  return calculateNextRunInZone(row, after, "America/Lima");
}

function getAutomationCopy(slug: string, type: AutomationType) {
  const isRetail = slug.toLowerCase().includes("retail");
  const isHub = slug.toLowerCase().includes("hub");

  if (type === "monthly_blog") {
    return {
      name: isRetail ? "Novedades del blog comercial" : isHub ? "Novedades del blog industrial" : "Novedades del blog empresarial",
      subject: isRetail ? "Novedades y artículos del mes" : isHub ? "Novedades y análisis industrial del mes" : "Novedades y artículos del mes",
      introduction: "Últimos contenidos y análisis publicados.",
      limit: 5,
    };
  }

  if (isRetail) {
    return {
      name: type === "weekly_new_properties" ? "Nuevos locales comerciales de la semana" : "Locales comerciales disponibles",
      subject: type === "weekly_new_properties" ? "Nuevos locales comerciales disponibles" : "Locales comerciales destacados del mes",
      introduction: type === "weekly_new_properties" ? "Descubre las mejores ubicaciones comerciales incorporadas recientemente." : "Una selección mensual de locales estratégicos para hacer crecer tu negocio.",
      limit: type === "weekly_new_properties" ? 5 : 10,
    };
  }

  if (isHub) {
    return {
      name: type === "weekly_new_properties" ? "Nuevos inmuebles industriales de la semana" : "Propiedades industriales disponibles",
      subject: type === "weekly_new_properties" ? "Nuevas propiedades industriales disponibles" : "Propiedades industriales destacadas del mes",
      introduction: type === "weekly_new_properties" ? "Nuevas naves, almacenes y terrenos industriales disponibles." : "Inventario actualizado de propiedades industriales clave.",
      limit: type === "weekly_new_properties" ? 5 : 10,
    };
  }

  return {
    name: type === "weekly_new_properties" ? "Nuevas oficinas de la semana" : "Oficinas disponibles",
    subject: type === "weekly_new_properties" ? "Nuevas oficinas disponibles" : "Oficinas disponibles para tu empresa",
    introduction: type === "weekly_new_properties" ? "Descubre las oportunidades de oficinas incorporadas recientemente." : "Una selección mensual de oficinas para hacer crecer tu negocio.",
    limit: type === "weekly_new_properties" ? 5 : 10,
  };
}

function interestForSlug(slug: string): ContactInterest {
  const clean = slug.toLowerCase().replace(/^area-/, "").replace(/^area/, "");
  if (clean === "prime" || clean === "areaprime") return "prime";
  if (clean === "hub" || clean === "areahub") return "hub";
  if (clean === "retail" || clean === "arearetail") return "retail";
  throw new Error(`La marca ${slug} no tiene un segmento de audiencia compatible.`);
}

export async function contentIdsForAutomation(
  db: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  siteIdOrSlug: string,
  type: AutomationType,
  limit: number,
) {
  let targetSiteUuid = siteIdOrSlug;
  if (!/^[0-9a-f-]{36}$/i.test(siteIdOrSlug)) {
    const slug = siteIdOrSlug.toLowerCase().includes("retail") ? "area-arearetail" : siteIdOrSlug.toLowerCase().includes("hub") ? "area-areahub" : "area-areaprime";
    const { data: s } = await db.from("sites").select("id").eq("slug", slug).single();
    if (s) targetSiteUuid = s.id;
  }
  const table = type === "monthly_blog" ? "blog_posts" : "properties";
  const { data, error } = await db
    .from(table)
    .select("id")
    .eq("site_id", targetSiteUuid)
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
  row: { id: string; site_id: string; type: AutomationType; requires_approval: boolean; sites?: any },
  scheduledFor: string,
  message: string,
) {
  const site = Array.isArray(row.sites) ? row.sites[0] : row.sites;
  const copy = getAutomationCopy(site?.slug ?? "", row.type);
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
  let { data, error } = await db.from("automation_settings")
    .select("id,site_id,type,frequency,day_of_week,day_of_month,send_time,requires_approval,next_run_at,user_id,sites!inner(name,slug,timezone,tokko_filter)")
    .eq("is_enabled", true);
  if (error && (error.code === "42703" || error.message?.includes("user_id"))) {
    const fallback = await db.from("automation_settings")
      .select("id,site_id,type,frequency,day_of_week,day_of_month,send_time,requires_approval,next_run_at,sites!inner(name,slug,timezone,tokko_filter)")
      .eq("is_enabled", true);
    data = fallback.data as any;
    error = fallback.error;
  }
  if (error) throw error;
  let created = 0;
  let failed = 0;
  const autoSendCampaignIds: string[] = [];
  for (const row of data ?? []) {
    const scheduled = row.next_run_at ? new Date(row.next_run_at) : nextRun(row, new Date(now.getTime() - 10 * 60 * 1000));
    const site = Array.isArray(row.sites) ? row.sites[0] : row.sites;
    const following = calculateNextRunInZone(row, now, site?.timezone ?? "America/Lima");
    if (scheduled > now) {
      if (!row.next_run_at) await db.from("automation_settings").update({ next_run_at: scheduled.toISOString() }).eq("id", row.id).is("next_run_at", null);
      continue;
    }
    const scheduledFor = scheduled.toISOString();
    const claimed = await db.rpc("claim_automation_run", {
      p_automation_id: row.id,
      p_expected_run: scheduledFor,
      p_next_run: following.toISOString(),
    });
    if (claimed.error) throw claimed.error;
    if (!claimed.data) continue;
    try {
      const copy = getAutomationCopy(site?.slug ?? "", row.type as AutomationType);
      const itemIds = await contentIdsForAutomation(db, row.site_id, row.type as AutomationType, copy.limit);
      const tokkoFilter = (site?.tokko_filter ?? {}) as Record<string, unknown>;
      const customMap = (tokkoFilter.automationRecipients ?? {}) as Record<string, string[]>;
      const customRecipients = Array.isArray(customMap[String(row.type)]) ? customMap[String(row.type)] : [];

      const campaign = await createCampaignDraft({
        siteId: interestForSlug(site?.slug ?? ""),
        type: row.type as AutomationType,
        name: `${copy.name} · ${site?.name ?? "Area Mail"}`,
        subject: `${copy.subject} · ${site?.name ?? "Area Mail"}`,
        introduction: copy.introduction,
        audienceInterest: interestForSlug(site?.slug ?? ""),
        customRecipients: customRecipients.length > 0 ? customRecipients : undefined,
        itemIds,
        automation: { id: row.id, scheduledFor, requiresApproval: row.requires_approval },
        userId: (row as any).user_id || undefined,
      });
      created += 1;
      if (!row.requires_approval) {
        await approveCampaign(campaign.id, `automation:${row.id}`);
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
  }
  return { created, failed, checked: data?.length ?? 0, autoSendCampaignIds };
}

export async function runTask(name: (typeof taskNames)[number]) {
  if (name === "run-due-automations") return runDueAutomations();
  const sites = await getSites(); if (!sites.length) throw new Error("No hay sitios persistidos.");
  if (name === "sync-properties") return syncTokkoProperties(sites[0]?.id || "prime");
  if (name === "sync-blog-posts") return Promise.all(sites.map((site) => syncWordPressPosts(site.id)));
  const type = name === "generate-weekly-properties" ? "weekly_new_properties" : name === "generate-monthly-properties" ? "monthly_properties" : "monthly_blog";
  const generated = sites.map((site) => createCampaign(site, type));
  const content = type === "monthly_blog" ? await getBlogPosts() : await getProperties();
  const limit = type === "weekly_new_properties" ? 5 : type === "monthly_properties" ? 10 : 5;
  await Promise.all(sites.map((site) => renderCampaignEmail(site, type, content.filter((item) => item.siteId === site.id && (type === "monthly_blog" || Boolean(item.publicUrl))).slice(0, limit))));
  return addCampaigns(generated);
}
