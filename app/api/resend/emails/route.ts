import { NextResponse } from "next/server";
import { getOutboundEmails } from "@/src/database/repositories";
import { assertPlatformOwner, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse } from "@/src/security/http";

export async function GET() {
  try {
    assertPlatformOwner(await requireApiAccess());
    return NextResponse.json({ ok: true, emails: await getOutboundEmails() });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo consultar el historial.");
  }
}
