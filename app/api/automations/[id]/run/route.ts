import { NextResponse } from "next/server";
import { assertSiteRole, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertSameOrigin, HttpError } from "@/src/security/http";
import { createSupabaseAdmin } from "@/src/database/supabase/server";
import { approveCampaign, createCampaignDraft } from "@/src/database/repositories";
import { dispatchCampaign } from "@/src/services/campaign-dispatch";
import type { AutomationType } from "@/src/domain/types";
import { contentIdsForAutomation } from "@/trigger/tasks";

function getAutomationCopy(slug: string, type: AutomationType) {
  const isRetail = slug.toLowerCase().includes("retail");
  const isHub = slug.toLowerCase().includes("hub");

  if (type === "monthly_blog") {
    return {
      name: isRetail ? "Novedades del blog comercial" : isHub ? "Novedades del blog industrial" : "Novedades del blog empresarial",
      subject: isRetail ? "Novedades y tendencias comerciales del mes" : isHub ? "Novedades y análisis industrial del mes" : "Novedades y análisis corporativo del mes",
      introduction: "Te compartimos las últimas publicaciones y análisis de mercado.",
      limit: 5,
    };
  }

  if (isRetail) {
    return {
      name: type === "weekly_new_properties" ? "Nuevos locales comerciales de la semana" : "Locales comerciales disponibles",
      subject: type === "weekly_new_properties" ? "Nuevos locales comerciales disponibles" : "Locales comerciales destacados del mes",
      introduction: type === "weekly_new_properties" ? "Descubre las mejores ubicaciones comerciales incorporadas recientemente." : "Una selección estratégica de locales comerciales disponibles para hacer crecer tu negocio.",
      limit: type === "weekly_new_properties" ? 5 : 10,
    };
  }

  if (isHub) {
    return {
      name: type === "weekly_new_properties" ? "Nuevos inmuebles industriales de la semana" : "Propiedades industriales disponibles",
      subject: type === "weekly_new_properties" ? "Nuevas propiedades industriales disponibles" : "Almacenes y terrenos industriales destacados",
      introduction: type === "weekly_new_properties" ? "Nuevas naves, almacenes y terrenos industriales incorporados recientemente." : "Inventario actualizado de naves, almacenes y terrenos industriales clave.",
      limit: type === "weekly_new_properties" ? 5 : 10,
    };
  }

  return {
    name: type === "weekly_new_properties" ? "Nuevas oficinas de la semana" : "Oficinas disponibles",
    subject: type === "weekly_new_properties" ? "Nuevas oficinas corporativas disponibles" : "Oficinas destacadas del mes",
    introduction: type === "weekly_new_properties" ? "Descubre las oportunidades de oficinas incorporadas recientemente." : "Revisa la selección de oficinas corporativas disponibles este mes.",
    limit: type === "weekly_new_properties" ? 5 : 10,
  };
}

const interestForSlug = (slug: string) => (slug.includes("retail") ? "retail" : slug.includes("hub") ? "hub" : "prime");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const access = await requireApiAccess();
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError("La automatización no es válida.");

    const db = createSupabaseAdmin();
    if (!db) throw new HttpError("La base de datos no está configurada.", 500);

    const { data: row, error } = await db
      .from("automation_settings")
      .select("id,site_id,type,frequency,day_of_week,day_of_month,send_time,requires_approval,sites!inner(name,slug,tokko_filter)")
      .eq("id", id)
      .single();
    if (error || !row) throw new HttpError("No se encontró la automatización.", 404);

    const site = Array.isArray(row.sites) ? row.sites[0] : row.sites;
    const siteKey = String(site?.slug ?? "").replace(/^area-/, "");
    assertSiteRole(access, siteKey, ["site_admin", "approver"]);

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
      automation: { id: row.id, scheduledFor: new Date().toISOString(), requiresApproval: row.requires_approval },
    });

    let sent = false;
    if (!row.requires_approval) {
      await approveCampaign(campaign.id, `manual-run:${access.user.id}`);
      await dispatchCampaign(campaign.id);
      sent = true;
    }

    await db.from("automation_settings").update({ last_run_at: new Date().toISOString() }).eq("id", row.id);

    return NextResponse.json({ ok: true, campaignId: campaign.id, sent });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo ejecutar la automatización.");
  }
}
