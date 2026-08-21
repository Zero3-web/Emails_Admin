import type { AutomationType, BlogPost, Property, Site } from "@/src/domain/types";

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]!);
const safeUrl = (value: string) => /^https:\/\//i.test(value) ? escapeHtml(value) : "#";
const color = (value: string) => /^#[0-9a-f]{6}$/i.test(value) ? value : "#2563EB";
const previewAttributes = (preview: boolean) => preview ? ' loading="lazy" decoding="async"' : "";

function propertyCard(site: Site, property: Property, preview: boolean) {
  const details = [property.location, property.area > 0 ? `${property.area.toLocaleString("es-PE")} m²` : ""].filter(Boolean).join(" · ");
  const price = property.price > 0 ? `${property.currency} ${property.price.toLocaleString("es-PE")}` : "Precio a consultar";
  const image = property.imageUrl ? `<img class="email-card-image" src="${safeUrl(property.imageUrl)}" alt="" width="562"${previewAttributes(preview)} style="display:block;width:100%;height:240px;object-fit:cover">` : "";
  return `<div class="email-card" style="overflow:hidden;margin:0 0 18px;border:1px solid #e5e7eb;border-radius:10px;background:#fff">${image}<div class="email-card-copy" style="padding:18px 18px 20px"><h2 style="margin:0 0 7px;color:#18212f;font-size:18px;line-height:24px">${escapeHtml(property.title)}</h2><p style="margin:0 0 10px;color:#69717a;font-size:13px;line-height:19px">${escapeHtml(details)}</p><p style="margin:0 0 16px;color:#18212f;font-size:16px;font-weight:700">${escapeHtml(price)}</p><a href="${safeUrl(property.publicUrl)}" target="_blank" style="display:inline-block;padding:11px 16px;border-radius:7px;background:${color(site.primaryColor)};color:#fff;font-size:13px;font-weight:700;text-decoration:none">Ver ficha de la oficina</a></div></div>`;
}

function postCard(site: Site, post: BlogPost, preview: boolean) {
  const image = post.imageUrl ? `<img class="email-card-image" src="${safeUrl(post.imageUrl)}" alt="" width="562"${previewAttributes(preview)} style="display:block;width:100%;height:240px;object-fit:cover">` : "";
  return `<div class="email-card" style="overflow:hidden;margin:0 0 18px;border:1px solid #e5e7eb;border-radius:10px">${image}<div class="email-card-copy" style="padding:18px"><h2 style="margin:0 0 7px;font-size:18px;line-height:24px">${escapeHtml(post.title)}</h2><p style="margin:0 0 14px;color:#69717a;font-size:13px;line-height:20px">${escapeHtml(post.excerpt)}</p><a href="${safeUrl(post.publicUrl)}" style="color:${color(site.primaryColor)};font-size:13px;font-weight:700;text-decoration:none">Leer artículo →</a></div></div>`;
}

function emailDocument(site: Site, title: string, introduction: string, content: string, unsubscribeUrl = "#", preview = false) {
  const unsubscribeControl = preview
    ? '<span style="color:#737b84;text-decoration:underline">Cancelar suscripción</span>'
    : `<a href="${safeUrl(unsubscribeUrl)}" style="color:#737b84;text-decoration:underline">Cancelar suscripción</a>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media only screen and (max-width:620px){.email-brand{padding:18px 20px!important;font-size:17px!important}.email-hero{padding:27px 20px 22px!important}.email-hero h1{font-size:25px!important;line-height:32px!important}.email-body{padding:22px 20px 6px!important}.email-footer{padding:20px!important}.email-card-image{height:190px!important}.email-card-copy{padding:16px!important}}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#aeb7c0;border-radius:999px}::-webkit-scrollbar-track{background:transparent}</style></head><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#18212f"><div style="max-width:620px;margin:0 auto;background:#fff"><div class="email-brand" style="padding:22px 28px;border-bottom:1px solid #e7e9ed;font-size:18px;font-weight:700">${escapeHtml(site.name)}</div><div class="email-hero" style="padding:34px 28px 26px;background:${color(site.primaryColor)};color:#fff"><div style="margin:0 0 8px;opacity:.75;font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase">Selección inmobiliaria</div><h1 style="margin:0;font-size:28px;line-height:35px">${escapeHtml(title)}</h1></div><div class="email-body" style="padding:26px 28px 10px"><p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:21px">${escapeHtml(introduction)}</p>${content}</div><div class="email-footer" style="padding:22px 28px 28px;border-top:1px solid #eceeef;text-align:center;color:#737b84;font-size:12px"><p style="margin:0 0 8px">${escapeHtml(site.name)} · ${escapeHtml(site.domain)}</p>${unsubscribeControl}</div></div></body></html>`;
}

export async function renderCampaignEmail(site: Site, type: AutomationType, items: Array<Property | BlogPost>, options: { preview?: boolean; unsubscribeUrl?: string } = {}) {
  if (!items.length) throw new Error("No hay contenido público para generar el correo.");
  if (type === "monthly_blog") {
    return emailDocument(site, "Novedades del mes", "Últimos contenidos publicados.", (items as BlogPost[]).map((post) => postCard(site, post, Boolean(options.preview))).join(""), options.unsubscribeUrl, Boolean(options.preview));
  }
  return emailDocument(
    site,
    type === "weekly_new_properties" ? "Nuevas oficinas de esta semana" : "Oficinas disponibles",
    type === "weekly_new_properties" ? "Descubre las oportunidades incorporadas recientemente." : "Una selección mensual de oficinas para hacer crecer tu negocio.",
    (items as Property[]).map((item) => propertyCard(site, item, Boolean(options.preview))).join(""),
    options.unsubscribeUrl,
    Boolean(options.preview),
  );
}
