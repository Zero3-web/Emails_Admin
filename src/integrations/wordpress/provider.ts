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
    const base = (site.wordpressUrl || `https://${site.domain}`).replace(
      /\/$/,
      "",
    );
    const fields =
      "id,date,modified,slug,link,title,excerpt,content,featured_media,_links,_embedded";
    const posts: BlogPost[] = [];
    for (let page = 1; page <= 20; page += 1) {
      const response = await safeExternalFetch(
        `${base}/wp-json/wp/v2/posts?status=publish&per_page=100&page=${page}&orderby=modified&order=desc&_embed=wp:featuredmedia&_fields=${fields}`,
        {
          headers: { accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(45_000),
        },
      );
      if (response.status === 400 && page > 1) break;
      if (!response.ok)
        throw new Error(
          `WordPress respondió ${response.status}. Verifica la URL pública del sitio.`,
        );
      const payload = await readLimitedJson<unknown>(response, 4 * 1024 * 1024);
      if (!Array.isArray(payload)) throw new Error("WordPress devolvió una respuesta inválida.");
      posts.push(
        ...(payload as WpPost[]).map((post) => {
          const media = post._embedded?.["wp:featuredmedia"]?.[0];
          const sizes = media?.media_details?.sizes;
          const imageUrl =
            sizes?.medium_large?.source_url ??
            sizes?.large?.source_url ??
            sizes?.medium?.source_url ??
            media?.source_url ??
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
            publicUrl: publicHttpUrlOrEmpty(post.link ?? `${base}/?p=${post.id}`),
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
