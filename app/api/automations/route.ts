import { NextResponse } from "next/server";
import { createAutomation } from "@/src/database/repositories";
import type { Automation, AutomationType } from "@/src/domain/types";
import { assertSiteRole, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertSameOrigin, assertSiteKey, HttpError, readJsonObject, singleLineString } from "@/src/security/http";

const types = new Set<AutomationType>(["weekly_new_properties", "monthly_properties", "monthly_blog"]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await readJsonObject(request);
    const siteId = assertSiteKey(input.siteId);
    const type = input.type as AutomationType;
    const frequency = input.frequency as Automation["frequency"];
    const day = Number(input.day);
    const sendTime = singleLineString(input.sendTime, "La hora", 5);
    if (!types.has(type) || !["weekly", "monthly"].includes(frequency)) throw new HttpError("El tipo o la frecuencia no son válidos.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(sendTime)) throw new HttpError("La hora de envío no es válida.");
    const max = frequency === "weekly" ? 7 : 28;
    const customRecipients = Array.isArray(input.customRecipients)
      ? input.customRecipients.filter((item): item is string => typeof item === "string" && item.includes("@"))
      : undefined;
    assertSiteRole(await requireApiAccess(), siteId, ["site_admin"]);
    return NextResponse.json({ ok: true, automation: await createAutomation({ siteId, type, frequency, day, sendTime, requiresApproval: Boolean(input.requiresApproval), customRecipients }) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo crear la automatización.");
  }
}
