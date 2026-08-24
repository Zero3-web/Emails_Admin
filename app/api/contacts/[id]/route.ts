import { NextResponse } from "next/server";
import { activateContact, deleteContact, suppressContact } from "@/src/database/repositories";
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
    if (body.status === "active") {
      return NextResponse.json({ ok: true, contact: await activateContact(id) });
    }
    if (body.status === "unsubscribed") {
      return NextResponse.json({ ok: true, contact: await suppressContact(id) });
    }
    throw new HttpError("Estado de contacto no soportado.");
  } catch (error) {
    return apiErrorResponse(error, "No se pudo actualizar el contacto.");
  }
}

export async function DELETE(
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
    await deleteContact(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo eliminar el contacto.");
  }
}
