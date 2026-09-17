import { NextResponse } from "next/server";
import { assertSiteRole, requireApiAccess } from "@/src/auth/server";
import { getCampaigns } from "@/src/database/repositories";
import { apiErrorResponse, assertSameOrigin, HttpError } from "@/src/security/http";
import { enforceRateLimit } from "@/src/security/rate-limit";
import { dispatchCampaign } from "@/src/services/campaign-dispatch";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "campaign-send", 10, 60);
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

    // Immediate direct dispatch via Resend API
    const result = await dispatchCampaign(id);
    return NextResponse.json({ ok: true, sent: true, summary: result }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo enviar la campaña.");
  }
}
