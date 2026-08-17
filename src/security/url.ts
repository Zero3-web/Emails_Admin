import { isIP } from "node:net";
import { HttpError } from "./core";

const forbiddenHostnames = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
]);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("::ffff:")
  );
}

export function assertPublicHttpUrl(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) return "";

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new HttpError(`${label} no es una URL válida.`);
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new HttpError(`${label} debe usar HTTP o HTTPS y no incluir credenciales.`);
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const ipHostname = hostname.replace(/^\[|\]$/g, "");
  if (
    forbiddenHostnames.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    (isIP(ipHostname) === 4 && isPrivateIpv4(ipHostname)) ||
    (isIP(ipHostname) === 6 && isPrivateIpv6(ipHostname))
  ) {
    throw new HttpError(`${label} no puede apuntar a una red privada o reservada.`);
  }
  return url.toString();
}

export function publicHttpUrlOrEmpty(value: unknown): string {
  try {
    return assertPublicHttpUrl(value, "La URL");
  } catch {
    return "";
  }
}
