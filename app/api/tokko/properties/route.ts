import { NextResponse } from "next/server";
import { TokkoProvider } from "@/src/integrations/tokko/provider";
import { assertPlatformOwner, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, HttpError } from "@/src/security/http";

export async function GET(request: Request) {
  try {
    assertPlatformOwner(await requireApiAccess());
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? 12);
    const offset = Number(searchParams.get("offset") ?? 0);
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || limit > 100 || offset < 0 || offset > 100_000) throw new HttpError("Parámetros de paginación inválidos.");
    const page = await new TokkoProvider().getPropertyPage({ limit, offset });
    return NextResponse.json({ ok: true, ...page, offset, syncedAt: new Date().toISOString() });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo consultar Tokko.");
  }
}
