import { NextResponse } from "next/server";
import { deleteAutomation, updateAutomation } from "@/src/database/repositories";
import type { Automation } from "@/src/domain/types";
import { assertSiteRole, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertSameOrigin, HttpError, readJsonObject, singleLineString } from "@/src/security/http";
import { createSupabaseAdmin } from "@/src/database/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const access = await requireApiAccess();
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError("La automatización no es válida.");

    const db = createSupabaseAdmin();
    if (db) {
      const { data: existing } = await db.from("automation_settings").select("site_id,sites!inner(slug)").eq("id", id).single();
      if (existing) {
        const siteSlug = Array.isArray(existing.sites) ? existing.sites[0]?.slug : (existing.sites as { slug?: string } | null)?.slug;
        const siteKey = String(siteSlug ?? "").replace(/^area-/, "");
        assertSiteRole(access, siteKey, ["site_admin"]);
      }
    }

    const input = await readJsonObject(request);
    const patch: Partial<Automation> = {};
    if (typeof input.isEnabled === "boolean") patch.isEnabled = input.isEnabled;
    if (typeof input.requiresApproval === "boolean") patch.requiresApproval = input.requiresApproval;
    if (input.frequency !== undefined) {
      if (input.frequency !== "weekly" && input.frequency !== "monthly") throw new HttpError("La frecuencia no es válida.");
      patch.frequency = input.frequency;
    }
    if (input.day !== undefined) {
      const day = Number(input.day);
      const frequency = patch.frequency;
      const max = frequency === "weekly" ? 7 : 28;
      if (!frequency || !Number.isInteger(day) || day < 1 || day > max) throw new HttpError(`El día debe estar entre 1 y ${max}.`);
      patch.day = day;
    }
    if (input.sendTime !== undefined) {
      const sendTime = singleLineString(input.sendTime, "La hora", 5);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(sendTime)) throw new HttpError("La hora de envío no es válida.");
      patch.sendTime = sendTime;
    }
    if (input.customRecipients !== undefined) {
      patch.customRecipients = Array.isArray(input.customRecipients)
        ? input.customRecipients.filter((item): item is string => typeof item === "string" && item.includes("@"))
        : [];
    }
    if (!Object.keys(patch).length) throw new HttpError("No se enviaron cambios válidos.");
    return NextResponse.json({ ok: true, automation: await updateAutomation(id, patch) });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo actualizar la automatización.");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const access = await requireApiAccess();
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError("La automatización no es válida.");

    const db = createSupabaseAdmin();
    if (db) {
      const { data: existing } = await db.from("automation_settings").select("site_id,sites!inner(slug)").eq("id", id).single();
      if (existing) {
        const siteSlug = Array.isArray(existing.sites) ? existing.sites[0]?.slug : (existing.sites as { slug?: string } | null)?.slug;
        const siteKey = String(siteSlug ?? "").replace(/^area-/, "");
        assertSiteRole(access, siteKey, ["site_admin"]);
      }
    }

    await deleteAutomation(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo eliminar la automatización.");
  }
}
