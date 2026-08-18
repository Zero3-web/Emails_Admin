import { NextResponse } from "next/server";
import type { AutomationType, ContactInterest } from "@/src/domain/types";
import { createCampaignDraft } from "@/src/database/repositories";
import { assertSiteRole, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertSameOrigin, assertSiteKey, HttpError, optionalString, readJsonObject, requiredString } from "@/src/security/http";

const types = new Set<AutomationType>(["weekly_new_properties", "monthly_properties", "monthly_blog"]);
const interests = new Set<ContactInterest>(["prime", "retail", "hub"]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await readJsonObject(request, 128 * 1024);
    const siteId = assertSiteKey(input.siteId);
    const type = input.type as AutomationType;
    const audienceInterest = input.audienceInterest as ContactInterest;
    if (!interests.has(audienceInterest)) throw new HttpError("La audiencia seleccionada no es válida.");
    if (!types.has(type)) throw new HttpError("El tipo de campaña no es válido.");
    const name = requiredString(input.name, "El nombre", 140);
    const subject = requiredString(input.subject, "El asunto", 200);
    const introduction = optionalString(input.introduction, "La introducción", 2_000) ?? "";
    if (!Array.isArray(input.itemIds) || input.itemIds.length > 100 || input.itemIds.some((id) => typeof id !== "string" || id.length > 100)) {
      throw new HttpError("Los elementos seleccionados no son válidos.");
    }
    const itemIds = [...new Set(input.itemIds as string[])];
    const customRecipients = Array.isArray(input.customRecipients)
      ? input.customRecipients.filter((email: unknown) => typeof email === "string" && email.includes("@"))
      : undefined;
    assertSiteRole(await requireApiAccess(), siteId, ["site_admin", "editor"]);
    return NextResponse.json({
      ok: true,
      ...(await createCampaignDraft({ siteId, type, name, subject, introduction, audienceInterest, itemIds, customRecipients })),
    }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo crear la campaña.");
  }
}
