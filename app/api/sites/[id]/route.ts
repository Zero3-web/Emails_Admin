import { NextResponse } from "next/server";
import { updateSite } from "@/src/database/repositories";
import type { Site } from "@/src/domain/types";
import { isAdminSession } from "@/src/auth/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminSession()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const patch = (await request.json()) as Partial<Site>;
    return NextResponse.json({ ok: true, site: await updateSite(id, patch) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
