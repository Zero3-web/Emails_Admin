import { NextResponse } from "next/server";
import { assertSiteRole, requireApiAccess } from "@/src/auth/server";
import { approveCampaign, deleteCampaign, getCampaigns, refreshCampaignAudience } from "@/src/database/repositories";
import { apiErrorResponse, assertSameOrigin, HttpError, readJsonObject } from "@/src/security/http";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    if (!uuid.test(id)) throw new HttpError("La campaña no es válida.");
    const input = await readJsonObject(request);
    if (input.action !== "approve" && input.action !== "refresh_audience") throw new HttpError("La acción solicitada no es válida.");
    const access = await requireApiAccess();
    const campaign = (await getCampaigns()).find((item) => item.id === id);
    if (!campaign) throw new HttpError("No se encontró la campaña.", 404);
    assertSiteRole(access, campaign.siteId, input.action === "refresh_audience" ? ["site_admin"] : ["site_admin", "approver"]);
    const result = input.action === "refresh_audience" ? await refreshCampaignAudience(id) : await approveCampaign(id, access.user.id);
    return NextResponse.json({ ok: true, campaign: result });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo aprobar la campaña.");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    if (!uuid.test(id)) throw new HttpError("La campaña no es válida.");
    const access = await requireApiAccess();
    const campaign = (await getCampaigns()).find((item) => item.id === id);
    if (!campaign) throw new HttpError("No se encontró la campaña.", 404);
    assertSiteRole(access, campaign.siteId, ["site_admin", "approver"]);
    await deleteCampaign(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo eliminar la campaña.");
  }
}
