import { NextResponse } from "next/server";
import { runTask, taskNames } from "@/trigger/tasks";
import { assertPlatformOwner, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertSameOrigin, HttpError } from "@/src/security/http";

export async function POST(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    assertSameOrigin(request);
    assertPlatformOwner(await requireApiAccess());
    const { name } = await params;
    if (!taskNames.includes(name as (typeof taskNames)[number])) throw new HttpError("La tarea no existe.", 404);
    const result = await runTask(name as (typeof taskNames)[number]);
    return NextResponse.json({ ok: true, mode: "live", items: Array.isArray(result) ? result.length : 1 });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo ejecutar la tarea.");
  }
}
