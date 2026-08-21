import { NextResponse } from "next/server";
import { suppressContactsBulk } from "@/src/database/repositories";
import { assertPlatformOwner, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertSameOrigin, HttpError, readJsonObject } from "@/src/security/http";

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    assertPlatformOwner(await requireApiAccess());
    const body = await readJsonObject(request);
    const { action, ids } = body;
    if (action !== "unsubscribe" || !Array.isArray(ids) || !ids.length) {
      throw new HttpError("Solicitud de baja masiva no válida.");
    }
    const updated = await suppressContactsBulk(ids);
    return NextResponse.json({ ok: true, count: updated.length });
  } catch (error) {
    return apiErrorResponse(error, "No se pudieron dar de baja los contactos seleccionados.");
  }
}
