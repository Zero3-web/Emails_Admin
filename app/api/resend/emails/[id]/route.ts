import { NextResponse } from "next/server";
import { getResendEmailStatus } from "@/src/integrations/resend/client";
import { assertPlatformOwner, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, HttpError } from "@/src/security/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertPlatformOwner(await requireApiAccess());
    const { id } = await params;
    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id)) throw new HttpError("El ID del correo no es válido.");
    return NextResponse.json({ ok: true, email: await getResendEmailStatus(id) });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo obtener el estado del correo.");
  }
}
