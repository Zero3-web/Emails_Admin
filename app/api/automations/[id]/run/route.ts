import { NextResponse } from "next/server";
import { assertSiteRole, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertSameOrigin, HttpError } from "@/src/security/http";
import { createSupabaseAdmin } from "@/src/database/supabase/server";
import { approveCampaign, createCampaignDraft } from "@/src/database/repositories";
import { dispatchCampaign } from "@/src/services/campaign-dispatch";
import type { AutomationType } from "@/src/domain/types";
import { contentIdsForAutomation } from "@/trigger/tasks";

const automationCopy: Record<AutomationType, { name: string; subject: string; introduction: string; limit: number }> = {
  weekly_new_properties: {
    name: "Nuevas oficinas de la semana",
    subject: "Nuevas oficinas disponibles",
    introduction: "Descubre las oportunidades incorporadas recientemente.",
    limit: 5,
  },
  monthly_properties: {
    name: "Oficinas disponibles",
    subject: "Oficinas destacadas del mes",
    introduction: "Revisa la selección de oficinas corporativas disponibles este mes.",
    limit: 10,
  },
  monthly_blog: {
    name: "Novedades del blog",
    subject: "Novedades y artículos del mes",
    introduction: "Te compartimos las últimas publicaciones y análisis de mercado.",
    limit: 5,
  },
};

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

    const copy = automationCopy[row.type as AutomationType];
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
