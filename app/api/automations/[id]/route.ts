import { NextResponse } from "next/server";
import { updateAutomation } from "@/src/database/repositories";
import type { Automation } from "@/src/domain/types";
import { isAdminSession } from "@/src/auth/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminSession()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const patch = (await request.json()) as Partial<Automation>;
    return NextResponse.json({
      ok: true,
      automation: await updateAutomation(id, patch),
    });
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
