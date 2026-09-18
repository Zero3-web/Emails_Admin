import { NextResponse } from "next/server";
import { syncTokkoProperties } from "@/src/database/repositories";
import { requireApiAccess } from "@/src/auth/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}

async function handleSync(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET?.trim();
    const url = new URL(request.url);
    const queryKey = url.searchParams.get("key");

    let isAuthorized = false;

    // 1. Validate against CRON_SECRET (via Authorization header or ?key= param)
    if (cronSecret) {
      if (authHeader === `Bearer ${cronSecret}` || queryKey === cronSecret) {
        isAuthorized = true;
      }
    }

    // 2. If not authorized via CRON_SECRET, fallback to authenticated admin session
    if (!isAuthorized) {
      try {
        const access = await requireApiAccess();
        if (access) {
          isAuthorized = true;
        }
      } catch {
        // Not an authenticated admin session
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado. Se requiere cabecera 'Authorization: Bearer <CRON_SECRET>' o sesión activa de administrador.",
        },
        { status: 401 },
      );
    }

    const result = await syncTokkoProperties("prime");
    return NextResponse.json({
      ok: true,
      syncedAt: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("Error in /api/tokko/sync-cron:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}
