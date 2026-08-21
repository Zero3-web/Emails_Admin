import { createHash } from "node:crypto";
import { createSupabaseAdmin } from "@/src/database/supabase/server";
import { HttpError } from "@/src/security/core";

export async function enforceRateLimit(request: Request, bucket: string, limit: number, windowSeconds = 60) {
  try {
    const db = createSupabaseAdmin();
    if (!db) {
      console.warn(`[RateLimit] Supabase admin client not initialized. Skipping rate limit for bucket: ${bucket}`);
      return;
    }

    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const address = forwarded || request.headers.get("x-real-ip") || "unknown";
    const key = createHash("sha256").update(`${process.env.RATE_LIMIT_SALT ?? "area-mail"}:${address}`).digest("hex");

    const { data, error } = await db.rpc("consume_rate_limit", {
      p_bucket: bucket,
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.warn(`[RateLimit] RPC 'consume_rate_limit' issue (${error.message || error.code}). Bypassing limit.`);
      return;
    }

    if (data === false) {
      throw new HttpError("Demasiadas solicitudes. Intenta nuevamente en unos minutos.", 429);
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.warn("[RateLimit] Exception in rate limit check (bypassed):", err);
  }
}
