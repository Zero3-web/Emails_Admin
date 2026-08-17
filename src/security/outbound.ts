import { assertPublicHttpUrl } from "./url";

const redirectStatuses = new Set([301, 302, 303, 307, 308]);

export async function safeExternalFetch(
  input: string,
  init: RequestInit = {},
  maxRedirects = 3,
): Promise<Response> {
  let current = assertPublicHttpUrl(input, "La URL externa");
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const response = await fetch(current, { ...init, redirect: "manual" });
    if (!redirectStatuses.has(response.status)) return response;
    const location = response.headers.get("location");
    if (!location || redirect === maxRedirects) throw new Error("La respuesta externa excedió el límite de redirecciones.");
    current = assertPublicHttpUrl(new URL(location, current).toString(), "La redirección externa");
  }
  throw new Error("No se pudo completar la solicitud externa.");
}

export async function readLimitedJson<T>(response: Response, maxBytes: number): Promise<T> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json") && !contentType.includes("+json")) throw new Error("El servicio externo no devolvió JSON.");
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error("La respuesta externa supera el tamaño permitido.");
  if (!response.body) throw new Error("El servicio externo devolvió una respuesta vacía.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let raw = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new Error("La respuesta externa supera el tamaño permitido.");
    }
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  return JSON.parse(raw) as T;
}
