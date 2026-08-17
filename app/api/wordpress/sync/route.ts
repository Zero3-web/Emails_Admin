import { NextResponse } from "next/server";
import { syncWordPressPosts } from "@/src/database/repositories";
import { assertSiteRole, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertSameOrigin, assertSiteKey, readJsonObject } from "@/src/security/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await readJsonObject(request);
    const siteId = assertSiteKey(input.siteId);
    assertSiteRole(await requireApiAccess(), siteId, ["site_admin"]);
    return NextResponse.json({ ok: true, ...(await syncWordPressPosts(siteId)) });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo sincronizar WordPress.");
  }
}
