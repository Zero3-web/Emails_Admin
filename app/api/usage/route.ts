import { NextResponse } from "next/server";
import { getResendUsage } from "@/src/database/repositories";
import { requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse } from "@/src/security/http";

export async function GET() {
  try {
    await requireApiAccess();
    const usage = await getResendUsage();
    return NextResponse.json({ ok: true, usage });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo consultar el uso.");
  }
}
