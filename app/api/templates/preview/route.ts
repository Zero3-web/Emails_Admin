import { NextResponse } from "next/server";
import type { AutomationType } from "@/src/domain/types";
import { getBlogPosts, getProperties, getSites } from "@/src/database/repositories";
import { renderCampaignEmail } from "@/src/services/email-renderer";
import { assertSiteRole, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertSiteKey, HttpError } from "@/src/security/http";

const allowed = new Set<AutomationType>(["weekly_new_properties", "monthly_properties", "monthly_blog"]);

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const siteId = assertSiteKey(params.get("siteId"));
    const type = params.get("type") as AutomationType | null;
    if (!type || !allowed.has(type)) throw new HttpError("Selecciona una marca y una plantilla válidas.");
    assertSiteRole(await requireApiAccess(), siteId, ["site_admin", "editor", "approver", "viewer"]);
    const [sites, content] = await Promise.all([
      getSites(),
      type === "monthly_blog" ? getBlogPosts() : getProperties(),
    ]);
    const site = sites.find((item) => item.id === siteId);
    if (!site) throw new HttpError("La marca seleccionada no existe.", 404);
    const items = type === "monthly_blog"
      ? content.filter((post) => post.siteId === site.id).slice(0, 5)
      : content.filter((property) => property.siteId === site.id && Boolean(property.publicUrl)).slice(0, type === "weekly_new_properties" ? 5 : 10);
    if (!items.length) throw new HttpError(type === "monthly_blog" ? "Sincroniza WordPress antes de generar este boletín." : "Esta marca no tiene propiedades con ficha pública.");
    const html = await renderCampaignEmail(site, type, items, { preview: true });
    const subject = type === "weekly_new_properties" ? `Nuevas oficinas de la semana · ${site.name}` : type === "monthly_properties" ? `Oficinas disponibles · ${site.name}` : `Novedades del mes · ${site.name}`;
    return NextResponse.json({ ok: true, html, subject, itemCount: items.length }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo generar el preview.");
  }
}
