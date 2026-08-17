import { NextResponse } from "next/server";
import { updateAutomation } from "@/src/database/repositories";
import type { Automation } from "@/src/domain/types";
import { assertPlatformOwner, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertSameOrigin, HttpError, readJsonObject, singleLineString } from "@/src/security/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    assertPlatformOwner(await requireApiAccess());
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError("La automatización no es válida.");
    const input = await readJsonObject(request);
    const patch: Partial<Automation> = {};
    if (typeof input.isEnabled === "boolean") patch.isEnabled = input.isEnabled;
    if (typeof input.requiresApproval === "boolean") patch.requiresApproval = input.requiresApproval;
    if (input.frequency !== undefined) {
      if (input.frequency !== "weekly" && input.frequency !== "monthly") throw new HttpError("La frecuencia no es válida.");
      patch.frequency = input.frequency;
    }
    if (input.day !== undefined) {
      const day = Number(input.day);
      const frequency = patch.frequency;
      const max = frequency === "weekly" ? 7 : 28;
      if (!frequency || !Number.isInteger(day) || day < 1 || day > max) throw new HttpError(`El día debe estar entre 1 y ${max}.`);
      patch.day = day;
    }
    if (input.sendTime !== undefined) {
      const sendTime = singleLineString(input.sendTime, "La hora", 5);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(sendTime)) throw new HttpError("La hora de envío no es válida.");
      patch.sendTime = sendTime;
    }
    if (!Object.keys(patch).length) throw new HttpError("No se enviaron cambios válidos.");
    return NextResponse.json({ ok: true, automation: await updateAutomation(id, patch) });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo actualizar la automatización.");
  }
}
