/**
 * Email Tracking Service
 * Injects invisible 1x1 open tracking pixel and wraps property/content links
 * with click-redirect tracking endpoints to guarantee real-time delivery analytics.
 */

export function isValidTrackingUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Injects open tracking pixel and wraps content links with /api/track/click
 */
export function injectEmailTracking(html: string, trackingId: string, baseUrl: string): string {
  if (!html || !trackingId || !baseUrl) return html;

  const cleanBase = baseUrl.replace(/\/+$/, "");

  // 1. Wrap clickable <a href="..."> links (skip unsubscribe, anchors, tel, mailto, and existing track endpoints)
  const linkRegex = /<a\b([^>]*?)\bhref=(["'])([^"'\s>]+)\2([^>]*)>/gi;
  let trackedHtml = html.replace(linkRegex, (match, before, quote, href, after) => {
    const trimmedHref = href.trim();

    // Skip mailto, tel, javascript, internal anchors, unsubscribe and tracking links
    if (
      trimmedHref.startsWith("#") ||
      trimmedHref.startsWith("mailto:") ||
      trimmedHref.startsWith("tel:") ||
      trimmedHref.startsWith("javascript:") ||
      trimmedHref.includes("/api/unsubscribe") ||
      trimmedHref.includes("/api/track/")
    ) {
      return match;
    }

    if (!isValidTrackingUrl(trimmedHref)) {
      return match;
    }

    const clickUrl = `${cleanBase}/api/track/click?id=${encodeURIComponent(trackingId)}&url=${encodeURIComponent(trimmedHref)}`;
    return `<a${before}href="${clickUrl}"${after}>`;
  });

  // 2. Inject 1x1 transparent GIF open tracking pixel
  const pixelUrl = `${cleanBase}/api/track/open?id=${encodeURIComponent(trackingId)}`;
  const pixelImg = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;border:0;mso-hide:all;" />`;

  if (trackedHtml.includes("</body>")) {
    trackedHtml = trackedHtml.replace("</body>", `${pixelImg}</body>`);
  } else {
    trackedHtml = `${trackedHtml}${pixelImg}`;
  }

  return trackedHtml;
}
