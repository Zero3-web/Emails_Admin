import type { AutomationType, BlogPost, Property, Site } from "@/src/domain/types";

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]!);

const safeUrl = (value: string) => {
  if (!value) return "#";
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return escapeHtml(value);
  return "#";
};

const color = (value: string) => /^#[0-9a-f]{6}$/i.test(value) ? value : "#2563EB";
const previewAttributes = (preview: boolean) => preview ? ' loading="lazy" decoding="async"' : "";

function getSegmentTitles(site: Site, type: AutomationType) {
  const slug = (site.slug || site.id).toLowerCase();
  const isRetail = slug.includes("retail");
  const isHub = slug.includes("hub") || slug.includes("industrial");

  if (type === "monthly_blog") {
    return {
      kicker: "BOLETÍN EDITORIAL",
      title: "Novedades del mes",
      intro: "Revisa los últimos artículos y novedades publicadas.",
    };
  }

  if (isRetail) {
    return {
      kicker: "SELECCIÓN INMOBILIARIA",
      title: type === "weekly_new_properties" ? "Nuevos locales comerciales de esta semana" : "Locales comerciales disponibles",
      intro: type === "weekly_new_properties" ? "Descubre las mejores ubicaciones comerciales incorporadas recientemente." : "Una selección de locales estratégicos para hacer crecer tu negocio.",
      buttonText: "Ver ficha del local",
    };
  }

  if (isHub) {
    return {
      kicker: "SELECCIÓN INMOBILIARIA",
      title: type === "weekly_new_properties" ? "Nuevos inmuebles industriales de esta semana" : "Propiedades industriales disponibles",
      intro: type === "weekly_new_properties" ? "Nuevas naves, almacenes y terrenos industriales disponibles." : "Inventario actualizado de propiedades industriales clave.",
      buttonText: "Ver propiedad industrial",
    };
  }

  return {
    kicker: "SELECCIÓN INMOBILIARIA",
    title: type === "weekly_new_properties" ? "Nuevas oficinas de esta semana" : "Oficinas disponibles",
    intro: type === "weekly_new_properties" ? "Descubre las oportunidades de oficinas incorporadas recientemente." : "Una selección mensual de oficinas para hacer crecer tu negocio.",
    buttonText: "Ver ficha de la oficina",
  };
}

function propertyCard(site: Site, property: Property, preview: boolean, buttonText: string) {
  const details = [property.location, property.area > 0 ? `${property.area.toLocaleString("es-PE")} m²` : ""].filter(Boolean).join(" · ");
  const price = property.price > 0 ? `${property.currency} ${property.price.toLocaleString("es-PE")}` : "Precio a consultar";
  const image = property.imageUrl
    ? `<img class="email-card-image" src="${safeUrl(property.imageUrl)}" alt="${escapeHtml(property.title)}" width="562" height="240"${previewAttributes(preview)} style="display:block;width:100%;max-width:100%;height:240px;object-fit:cover;border-top-left-radius:12px;border-top-right-radius:12px;background:#f1f5f9;">`
    : "";

  return `
    <div class="email-card" style="overflow:hidden;margin:0 0 24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      ${image}
      <div class="email-card-copy" style="padding:20px 22px 22px;">
        <h2 style="margin:0 0 8px;color:#0f172a;font-size:18px;line-height:24px;font-weight:700;">${escapeHtml(property.title)}</h2>
        ${details ? `<p style="margin:0 0 14px;color:#64748b;font-size:13px;line-height:18px;">📍 ${escapeHtml(details)}</p>` : ""}
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid #f1f5f9;">
          <div style="margin:0 0 12px 0;font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;line-height:22px;">
            ${escapeHtml(price)}
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
            <tr>
              <td align="center" style="padding:0;">
                <a class="email-btn" href="${safeUrl(property.publicUrl)}" target="_blank" style="display:block;width:100%;box-sizing:border-box;-webkit-box-sizing:border-box;padding:12px 18px;border-radius:8px;background:${color(site.primaryColor)};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.1);letter-spacing:0.01em;">
                  ${buttonText} →
                </a>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  `;
}

function postCard(site: Site, post: BlogPost, preview: boolean) {
  const image = post.imageUrl
    ? `<img class="email-card-image" src="${safeUrl(post.imageUrl)}" alt="${escapeHtml(post.title)}" width="562" height="240"${previewAttributes(preview)} style="display:block;width:100%;max-width:100%;height:240px;object-fit:cover;border-top-left-radius:12px;border-top-right-radius:12px;background:#f1f5f9;">`
    : "";

  return `
    <div class="email-card" style="overflow:hidden;margin:0 0 24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      ${image}
      <div class="email-card-copy" style="padding:20px 22px 22px;">
        <h2 style="margin:0 0 8px;color:#0f172a;font-size:18px;line-height:24px;font-weight:700;">${escapeHtml(post.title)}</h2>
        <p style="margin:0 0 16px;color:#64748b;font-size:13px;line-height:20px;">${escapeHtml(post.excerpt)}</p>
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid #f1f5f9;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
            <tr>
              <td align="center" style="padding:0;">
                <a class="email-btn" href="${safeUrl(post.publicUrl)}" target="_blank" style="display:block;width:100%;box-sizing:border-box;-webkit-box-sizing:border-box;padding:12px 18px;border-radius:8px;background:${color(site.primaryColor)};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.1);letter-spacing:0.01em;">
                  Leer artículo completo →
                </a>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  `;
}

function emailDocument(site: Site, kicker: string, title: string, introduction: string, content: string, unsubscribeUrl = "#", preview = false) {
  const unsubscribeControl = preview
    ? '<span style="color:#64748b;text-decoration:underline;">Cancelar suscripción</span>'
    : `<a href="${safeUrl(unsubscribeUrl)}" style="color:#64748b;text-decoration:underline;">Cancelar suscripción</a>`;

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${escapeHtml(title)}</title>
  <style>
    @media only screen and (max-width:620px){
      .email-container{width:100%!important;border-radius:0!important;border:none!important}
      .email-brand{padding:16px 20px!important;font-size:17px!important}
      .email-hero{padding:24px 20px!important}
      .email-hero h1{font-size:22px!important;line-height:28px!important}
      .email-body{padding:20px 16px 6px!important}
      .email-footer{padding:20px 16px!important}
      .email-card{margin:0 0 18px!important;border-radius:10px!important}
      .email-card-image{height:180px!important}
      .email-card-copy{padding:16px!important}
      .email-btn{padding:13px 16px!important;font-size:14px!important}
    }
  </style>
</head>
<body style="margin:0;padding:20px 0;background:#f1f5f9;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div class="email-container" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
    <div class="email-brand" style="padding:20px 28px;background:#ffffff;border-bottom:1px solid #f1f5f9;font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;">
      ${escapeHtml(site.name)}
    </div>
    <div class="email-hero" style="padding:32px 28px 26px;background:${color(site.primaryColor)};color:#ffffff;">
      <div style="margin:0 0 8px;opacity:0.85;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(kicker)}</div>
      <h1 style="margin:0;font-size:26px;line-height:34px;font-weight:800;color:#ffffff;">${escapeHtml(title)}</h1>
    </div>
    <div class="email-body" style="padding:28px 28px 10px;">
      <p style="margin:0 0 22px;color:#475569;font-size:14px;line-height:22px;">${escapeHtml(introduction)}</p>
      ${content}
    </div>
    <div class="email-footer" style="padding:24px 28px 28px;border-top:1px solid #f1f5f9;text-align:center;color:#64748b;font-size:12px;background:#f8fafc;">
      <p style="margin:0 0 8px;font-weight:600;">${escapeHtml(site.name)} · ${escapeHtml(site.domain)}</p>
      <p style="margin:0;">${unsubscribeControl}</p>
    </div>
  </div>
</body>
</html>`;
}

export async function renderCampaignEmail(site: Site, type: AutomationType, items: Array<Property | BlogPost>, options: { preview?: boolean; unsubscribeUrl?: string } = {}) {
  if (!items.length) throw new Error("No hay contenido público para generar el correo.");
  const segment = getSegmentTitles(site, type);

  if (type === "monthly_blog") {
    return emailDocument(
      site,
      segment.kicker,
      segment.title,
      segment.intro,
      (items as BlogPost[]).map((post) => postCard(site, post, Boolean(options.preview))).join(""),
      options.unsubscribeUrl,
      Boolean(options.preview)
    );
  }

  return emailDocument(
    site,
    segment.kicker,
    segment.title,
    segment.intro,
    (items as Property[]).map((item) => propertyCard(site, item, Boolean(options.preview), segment.buttonText ?? "Ver propiedad")).join(""),
    options.unsubscribeUrl,
    Boolean(options.preview)
  );
}
