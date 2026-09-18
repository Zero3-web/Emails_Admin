import type { BlogPost, Site } from "@/src/domain/types";
import type { BlogProvider } from "./types";
import { readLimitedJson, safeExternalFetch } from "@/src/security/outbound";
import { publicHttpUrlOrEmpty } from "@/src/security/url";

type Rendered = { rendered?: string };
type Media = {
  source_url?: string;
  media_details?: { sizes?: Record<string, { source_url?: string }> };
};
type WpPost = {
  id: number;
  date?: string;
  link?: string;
  title?: Rendered;
  excerpt?: Rendered;
  content?: Rendered;
  _embedded?: { "wp:featuredmedia"?: Media[] };
};

const decodeEntities = (value: string) =>
  value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

const cleanText = (value = "") =>
  decodeEntities(value.replace(/<[^>]*>/g, " ").replace(/\[[^\]]*\]/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const editorialText = (html = "") =>
  [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => cleanText(match[1]))
    .filter(
      (value) =>
        value.length >= 35 &&
        !/^(vc_|column_|row_|background_|font_)/i.test(value),
    )
    .join(" ");

const shortExcerpt = (value: string, limit = 210) =>
  value.length <= limit
    ? value
    : `${value
        .slice(0, limit)
        .replace(/\s+\S*$/, "")
        .trim()}…`;

export class WordPressProvider implements BlogProvider {
  async getPosts(site: Site): Promise<BlogPost[]> {
    const isAreaHub =
      site.slug.includes("hub") ||
      site.domain.includes("area-hub") ||
      site.wordpressUrl.includes("area-hub");

    // Special handler for Area Hub (Vercel + Supabase Headless Blog via site_config)
    if (isAreaHub) {
      const areaHubSupabaseUrl = process.env.AREAHUB_SUPABASE_URL ?? "https://vztirszogukjfcyfmpkk.supabase.co";
      const areaHubAnonKey = process.env.AREAHUB_SUPABASE_ANON_KEY ??
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dGlyc3pvZ3VramZjeWZtcGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMDcwNjIsImV4cCI6MjA3MTU4MzA2Mn0.W_-U0Zi3XT1-BGhDYO4Gm6qLGEHLdaNL4fLM9-m9IJc";

      const res = await safeExternalFetch(
        `${areaHubSupabaseUrl}/rest/v1/site_config?key=eq.blog_posts&select=*`,
        {
          headers: {
            apikey: areaHubAnonKey,
            authorization: `Bearer ${areaHubAnonKey}`,
            accept: "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(30_000),
        },
      );

      if (!res.ok) {
        throw new Error(`Area Hub Blog API devolvió el estado ${res.status}.`);
      }

      const rows = await readLimitedJson<any[]>(res, 4 * 1024 * 1024);
      let items: any[] = [];
      if (Array.isArray(rows) && rows.length > 0 && rows[0]?.value) {
        try {
          items = typeof rows[0].value === "string" ? JSON.parse(rows[0].value) : rows[0].value;
        } catch {
          items = [];
        }
      }

      if (!Array.isArray(items)) return [];

      return items.map((item) => {
        const title = item.title || item.title_es || "Artículo Area Hub";
        const excerpt = item.excerpt || item.excerpt_es || `Conoce más sobre ${title}`;
        const slug = item.slug || item.id;
        const publicUrl = `https://www.area-hub.com/blog/${slug}`;
        const imageUrl =
          item.cover_image ||
          item.image_url ||
          item.thumbnail_url ||
          "https://vztirszogukjfcyfmpkk.supabase.co/storage/v1/object/public/receipts/Logo.png";

        return {
          id: `areahub-${item.id}`,
          siteId: site.id,
          externalId: String(item.id),
          title,
          excerpt: shortExcerpt(excerpt),
          imageUrl: publicHttpUrlOrEmpty(imageUrl),
          publicUrl: publicHttpUrlOrEmpty(publicUrl),
          publishedAt: item.date || item.created_at || item.published_at || new Date().toISOString(),
        };
      });
    }

    // Standard WordPress REST API provider (Area Prime & Area Retail)
    let rawBase = (site.wordpressUrl || `https://${site.domain}`).replace(/\/$/, "");
    rawBase = rawBase.replace(/\/blog$/i, "");

    const candidates = [
      rawBase,
      rawBase.replace(/^https:/i, "http:"),
      rawBase.replace(/^http:/i, "https:"),
    ];

    const uniqueBases = Array.from(new Set(candidates));
    const fields =
      "id,date,modified,slug,link,title,excerpt,content,featured_media,_links,_embedded";
    const posts: BlogPost[] = [];
    let workingBase = uniqueBases[0];

    for (let page = 1; page <= 20; page += 1) {
      let response: Response | null = null;
      let lastError: Error | null = null;

      for (const base of uniqueBases) {
        try {
          const res = await safeExternalFetch(
            `${base}/wp-json/wp/v2/posts?status=publish&per_page=100&page=${page}&orderby=modified&order=desc&_embed=wp:featuredmedia&_fields=${fields}`,
            {
              headers: { accept: "application/json" },
              cache: "no-store",
              signal: AbortSignal.timeout(30_000),
            },
          );
          if (res.ok || (res.status === 400 && page > 1)) {
            response = res;
            workingBase = base;
            break;
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }

      if (!response) {
        throw new Error(
          lastError?.message || `WordPress respondió con un error al conectar con ${site.name}. Verifica la URL.`,
        );
      }

      if (response.status === 400 && page > 1) break;
      const payload = await readLimitedJson<unknown>(response, 4 * 1024 * 1024);
      if (!Array.isArray(payload)) throw new Error("WordPress devolvió una respuesta inválida.");
      
      posts.push(
        ...(payload as WpPost[]).map((post) => {
          const media = post._embedded?.["wp:featuredmedia"]?.[0];
          const sizes = media?.media_details?.sizes;
          const imageUrl =
            sizes?.full?.source_url ??
            media?.source_url ??
            sizes?.["1536x1536"]?.source_url ??
            sizes?.["2048x2048"]?.source_url ??
            sizes?.large?.source_url ??
            sizes?.medium_large?.source_url ??
            "";
          const title = cleanText(post.title?.rendered);
          const candidate =
            editorialText(post.content?.rendered) ||
            cleanText(post.excerpt?.rendered);
          const summary = /\[vc_|column_|row_|background_|font_/i.test(
            candidate,
          )
            ? `Conoce más sobre ${title}.`
            : candidate;
          return {
            id: `wordpress-${post.id}`,
            siteId: site.id,
            externalId: String(post.id),
            title,
            excerpt: shortExcerpt(summary),
            imageUrl: publicHttpUrlOrEmpty(imageUrl),
            publicUrl: publicHttpUrlOrEmpty(post.link ?? `${workingBase}/?p=${post.id}`),
            publishedAt: post.date ?? "",
          };
        }),
      );

      const totalPages = Math.min(Number(response.headers.get("x-wp-totalpages") ?? "1"), 20);
      if (!Number.isFinite(totalPages) || page >= totalPages) break;
    }
    return posts;
  }
}
