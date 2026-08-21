type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 429 | 500 | 503;

export class HttpError extends Error {
  constructor(message: string, public readonly status: ErrorStatus = 400) {
    super(message);
    this.name = "HttpError";
  }
}

export function assertSameOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") throw new HttpError("Solicitud rechazada por seguridad.", 403);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new HttpError("Solicitud rechazada por seguridad.", 403);
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}
