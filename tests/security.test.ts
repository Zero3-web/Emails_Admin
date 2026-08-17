import assert from "node:assert/strict";
import test from "node:test";
import { assertSameOrigin, escapeHtml, HttpError } from "../src/security/core";
import { assertPublicHttpUrl } from "../src/security/url";
import { safeRelativePath } from "../src/security/redirect";
import { safeExternalFetch } from "../src/security/outbound";

test("escapeHtml neutraliza etiquetas y atributos", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert('x')">`), "&lt;img src=x onerror=&quot;alert(&#039;x&#039;)&quot;&gt;");
});

test("assertSameOrigin rechaza solicitudes cross-site", () => {
  const request = new Request("https://mail.example/api/send", {
    method: "POST",
    headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
  });
  assert.throws(() => assertSameOrigin(request), HttpError);
});

test("assertPublicHttpUrl bloquea SSRF hacia redes privadas", () => {
  for (const value of ["http://127.0.0.1/admin", "http://169.254.169.254/", "http://10.0.0.1", "http://[::1]/"]) {
    assert.throws(() => assertPublicHttpUrl(value, "URL"), HttpError);
  }
  assert.equal(assertPublicHttpUrl("https://example.com/news", "URL"), "https://example.com/news");
});

test("safeRelativePath bloquea redirecciones externas", () => {
  assert.equal(safeRelativePath("//evil.example", "/dashboard"), "/dashboard");
  assert.equal(safeRelativePath("/\\evil.example", "/dashboard"), "/dashboard");
  assert.equal(safeRelativePath("/campaigns?id=1", "/dashboard"), "/campaigns?id=1");
});

test("safeExternalFetch valida cada redirección externa", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(null, {
      status: 302,
      headers: { location: "http://127.0.0.1/private" },
    })) as typeof fetch;
  try {
    await assert.rejects(
      () => safeExternalFetch("https://example.com/feed"),
      HttpError,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
