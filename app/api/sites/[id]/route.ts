import { NextResponse } from "next/server";
import { updateSite } from "@/src/database/repositories";
import type { Site } from "@/src/domain/types";
import { assertPlatformOwner, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertDomain, assertEmail, assertSameOrigin, assertSiteKey, HttpError, optionalString, readJsonObject, requiredString, singleLineString } from "@/src/security/http";
import { publicHttpUrlOrEmpty } from "@/src/security/url";

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
      senderName: singleLineString(input.senderName, "El remitente", 120),
      senderEmail: assertEmail(input.senderEmail, "El correo remitente"),
    };

    if (input.wordpressUrl !== undefined) {
      patch.wordpressUrl = publicHttpUrlOrEmpty(input.wordpressUrl);
    }
    if (input.logoUrl !== undefined) {
      patch.logoUrl = publicHttpUrlOrEmpty(input.logoUrl);
    }
    if (input.slug !== undefined && typeof input.slug === "string" && input.slug.trim()) {
      const slug = singleLineString(input.slug, "El slug", 68).toLowerCase();
      if (!/^[a-z0-9](?:[a-z0-9-]{0,62})$/.test(slug)) {
        throw new HttpError("El slug solo puede contener letras minúsculas, números y guiones.");
      }
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
    if (input.timezone !== undefined && typeof input.timezone === "string") {
      patch.timezone = input.timezone || "America/Lima";
    }
    if (typeof input.isActive === "boolean") {
      patch.isActive = input.isActive;
    }

    const updated = await updateSite(siteId, patch);
    return NextResponse.json({ ok: true, site: updated });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo actualizar el sitio.");
  }
}
