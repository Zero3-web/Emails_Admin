import { NextResponse } from "next/server";
import type { ContactInterest } from "@/src/domain/types";
import { importContacts } from "@/src/database/repositories";
import { assertSiteRole, requireApiAccess } from "@/src/auth/server";
import { apiErrorResponse, assertEmail, assertSameOrigin, assertSiteKey, HttpError, optionalString, readJsonObject } from "@/src/security/http";

const interests = new Set<ContactInterest>(["prime", "retail", "hub"]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await readJsonObject(request, 2 * 1024 * 1024);
    const siteId = assertSiteKey(input.siteId);
    const interest = input.interest as ContactInterest;
    if (!interests.has(interest)) throw new HttpError("El interés seleccionado no es válido.");
    if (!Array.isArray(input.rows) || input.rows.length === 0 || input.rows.length > 5000) {
      throw new HttpError("El archivo debe contener entre 1 y 5,000 filas.");
    }
    const rows = input.rows.map((value, index) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(`La fila ${index + 1} no es válida.`);
      const row = value as Record<string, unknown>;
      return {
        email: assertEmail(row.email, `El correo de la fila ${index + 1}`),
        firstName: optionalString(row.firstName, "El nombre", 100),
        lastName: optionalString(row.lastName, "El apellido", 100),
        company: optionalString(row.company, "La empresa", 160),
        phone: optionalString(row.phone, "El teléfono", 40),
      };
    });
    assertSiteRole(await requireApiAccess(), siteId, ["site_admin"]);
    return NextResponse.json({
      ok: true,
      ...(await importContacts({
        siteId,
        interest,
        consentSource: optionalString(input.consentSource, "La fuente de consentimiento", 250) ?? "",
        consentConfirmed: input.consentConfirmed === true,
        rows,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error, "No se pudieron importar los contactos.");
  }
}
