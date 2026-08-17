import { NextResponse } from "next/server";
import { createSite } from "@/src/database/repositories";
import { assertPlatformOwner, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertEmail, assertSameOrigin, optionalString, readJsonObject, requiredString } from "@/src/security/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertPlatformOwner(await requireApiAccess());
    const data = await readJsonObject(request);
    const site = await createSite({
      domain: requiredString(data.domain, "El dominio", 253),
      name: optionalString(data.name, "El nombre", 120),
      description: optionalString(data.description, "La descripción", 2_000),
      businessType: optionalString(data.businessType, "El tipo de negocio", 120),
      senderName: optionalString(data.senderName, "El remitente", 120),
      senderEmail: data.senderEmail ? assertEmail(data.senderEmail, "El correo remitente") : undefined,
    });
    return NextResponse.json({ ok: true, site }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo crear el sitio.");
  }
}
