import { NextResponse } from "next/server";
import { deleteContactsBulk, suppressContactsBulk } from "@/src/database/repositories";
import { assertPlatformOwner, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertSameOrigin, HttpError, readJsonObject } from "@/src/security/http";

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    assertPlatformOwner(await requireApiAccess());
    const body = await readJsonObject(request);
    const { action, ids } = body;
    if (!Array.isArray(ids) || !ids.length) {
      throw new HttpError("Solicitud masiva no válida.");
    }
    if (action === "unsubscribe") {
      const updated = await suppressContactsBulk(ids);
      return NextResponse.json({ ok: true, count: updated.length });
    }
    if (action === "delete") {
      const deletedCount = await deleteContactsBulk(ids);
      return NextResponse.json({ ok: true, count: deletedCount });
    }
    throw new HttpError("Acción masiva no soportada.");
  } catch (error) {
    return apiErrorResponse(error, "No se pudo procesar la acción masiva en contactos.");
  }
}
