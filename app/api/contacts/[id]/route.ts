import { NextResponse } from "next/server";
import { suppressContact } from "@/src/database/repositories";
import { assertPlatformOwner, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertSameOrigin, HttpError, readJsonObject } from "@/src/security/http";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    assertPlatformOwner(await requireApiAccess());
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new HttpError("El contacto no es válido.");
    }
    const body = await readJsonObject(request);
    if (body.status !== "unsubscribed") {
      throw new HttpError("Solo se permite registrar una baja definitiva.");
    }
    return NextResponse.json({ ok: true, contact: await suppressContact(id) });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo actualizar el contacto.");
  }
}
