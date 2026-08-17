import { NextResponse } from "next/server";
import { AuthError } from "@/src/auth/server";
import { HttpError } from "./core";
export { HttpError, assertSameOrigin, escapeHtml } from "./core";

export async function readJsonObject(
  request: Request,
  maxBytes = 64 * 1024,
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new HttpError("El contenido debe enviarse como JSON.", 415);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpError("La solicitud supera el tamaño permitido.", 413);
  }

  const raw = await readTextLimited(request, maxBytes);

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new HttpError("El JSON enviado no es válido.", 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError("El cuerpo de la solicitud no es válido.", 400);
  }
  return value as Record<string, unknown>;
}

export async function readTextLimited(request: Request, maxBytes: number): Promise<string> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let result = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new HttpError("La solicitud supera el tamaño permitido.", 413);
      }
      result += decoder.decode(value, { stream: true });
    }
    return result + decoder.decode();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError("El cuerpo de la solicitud no es texto UTF-8 válido.");
  }
}

export function requiredString(
  value: unknown,
  label: string,
  maxLength: number,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(`${label} es obligatorio.`);
  }
  const result = value.trim();
  if (result.length > maxLength) {
    throw new HttpError(`${label} supera el máximo de ${maxLength} caracteres.`);
  }
  return result;
}

export function optionalString(
  value: unknown,
  label: string,
  maxLength: number,
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requiredString(value, label, maxLength);
}

export function singleLineString(value: unknown, label: string, maxLength: number) {
  const result = requiredString(value, label, maxLength);
  if (/[\r\n\0]/.test(result)) throw new HttpError(`${label} contiene caracteres no permitidos.`);
  return result;
}

export function assertDomain(value: unknown): string {
  let domain = singleLineString(value, "El dominio", 253).toLowerCase();
  domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
    throw new HttpError("El dominio no es válido.");
  }
  return domain;
}

export function assertSiteKey(value: unknown): string {
  const siteId = requiredString(value, "La marca", 63).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62})$/.test(siteId)) {
    throw new HttpError("La marca seleccionada no es válida.");
  }
  return siteId;
}

export function assertEmail(value: unknown, label = "El correo"): string {
  const email = requiredString(value, label, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(`${label} no es válido.`);
  }
  return email;
}

export function apiErrorResponse(error: unknown, fallback: string) {
  if (error instanceof AuthError || error instanceof HttpError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: error.status },
    );
  }

  const incidentId = crypto.randomUUID();
  console.error(`[${incidentId}] ${fallback}`, error);
  return NextResponse.json(
    { ok: false, error: fallback, incidentId },
    { status: 500 },
  );
}
