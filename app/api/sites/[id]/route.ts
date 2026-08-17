import { NextResponse } from "next/server";
import { updateSite } from "@/src/database/repositories";
import type { Site } from "@/src/domain/types";
import { assertPlatformOwner, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertDomain, assertEmail, assertSameOrigin, assertSiteKey, HttpError, optionalString, readJsonObject, requiredString, singleLineString } from "@/src/security/http";
import { assertPublicHttpUrl } from "@/src/security/url";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    assertPlatformOwner(await requireApiAccess());
    const { id } = await params;
    const siteId = assertSiteKey(id);
    const input = await readJsonObject(request, 64 * 1024);
    const patch: Partial<Site> = {
      name: requiredString(input.name, "El nombre", 120),
      description: optionalString(input.description, "La descripción", 2_000) ?? "",
      businessType: optionalString(input.businessType, "El tipo de negocio", 120) ?? "",
      domain: assertDomain(input.domain),
      wordpressUrl: assertPublicHttpUrl(input.wordpressUrl, "La URL de WordPress"),
      logoUrl: assertPublicHttpUrl(input.logoUrl, "La URL del logo"),
      senderName: singleLineString(input.senderName, "El remitente", 120),
      senderEmail: assertEmail(input.senderEmail, "El correo remitente"),
    };
    if (input.slug !== undefined) {
      const slug = singleLineString(input.slug, "El slug", 68).toLowerCase();
      if (!/^area-[a-z0-9](?:[a-z0-9-]{0,62})$/.test(slug)) throw new HttpError("El slug debe comenzar con area- y usar letras, números o guiones.");
      patch.slug = slug;
    }
    if (input.primaryColor !== undefined) {
      const color = singleLineString(input.primaryColor, "El color principal", 7);
      if (!/^#[0-9a-f]{6}$/i.test(color)) throw new HttpError("El color principal no es válido.");
      patch.primaryColor = color;
    }
    if (input.secondaryColor !== undefined) {
      const color = singleLineString(input.secondaryColor, "El color secundario", 7);
      if (!/^#[0-9a-f]{6}$/i.test(color)) throw new HttpError("El color secundario no es válido.");
      patch.secondaryColor = color;
    }
    if (input.timezone !== undefined) {
      const timezone = singleLineString(input.timezone, "La zona horaria", 64);
      if (timezone !== "America/Lima") throw new HttpError("La zona horaria no está permitida.");
      patch.timezone = timezone;
    }
    if (typeof input.isActive === "boolean") patch.isActive = input.isActive;
    return NextResponse.json({ ok: true, site: await updateSite(siteId, patch) });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo actualizar el sitio.");
  }
}
