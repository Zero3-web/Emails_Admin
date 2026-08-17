import type { Property } from "@/src/domain/types";
import type { PropertyProvider } from "./types";
import { classifyProperty } from "@/src/services/property-classifier";
import { readLimitedJson } from "@/src/security/outbound";
import { publicHttpUrlOrEmpty } from "@/src/security/url";

type TokkoProperty = {
  id: number;
  publication_title?: string;
  description?: string;
  type?: { name?: string };
  location?: { short_location?: string; full_location?: string; name?: string };
  address?: string;
  operations?: Array<{ prices?: Array<{ price?: number; currency?: string }> }>;
  photos?: Array<{ image?: string; thumb?: string; is_front_cover?: boolean }>;
  public_url?: string;
  status?: number | string;
  created_at?: string;
  total_surface?: string | number;
  surface?: string | number;
};
type TokkoResponse = {
  meta?: { total_count?: number };
  objects?: TokkoProperty[];
};

export type TokkoPropertyPage = { properties: Property[]; total: number };

export class TokkoProvider implements PropertyProvider {
  async getProperties(
    options: { limit?: number; offset?: number } = {},
  ): Promise<Property[]> {
    return (await this.getPropertyPage(options)).properties;
  }
  async getPropertyPage({
    limit = 20,
    offset = 0,
  }: { limit?: number; offset?: number } = {}): Promise<TokkoPropertyPage> {
    const key = process.env.TOKKO_API_KEY;
    if (!key) throw new Error("TOKKO_API_KEY no está configurada.");
    const params = new URLSearchParams({
      format: "json",
      lang: "es_ar",
      key,
      limit: String(Math.min(Math.max(limit, 1), 50)),
      offset: String(Math.max(offset, 0)),
    });
    const response = await fetch(
      `https://www.tokkobroker.com/api/v1/property/?${params}`,
      {
        headers: { accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!response.ok)
      throw new Error(
        `Tokko respondió ${response.status}. Verifica la clave y sus permisos.`,
      );
    const payload = await readLimitedJson<TokkoResponse>(response, 4 * 1024 * 1024);
    return {
      properties: (payload.objects ?? []).map(mapTokkoProperty),
      total: payload.meta?.total_count ?? payload.objects?.length ?? 0,
    };
  }
}

function mapTokkoProperty(item: TokkoProperty): Property {
  const cover =
    item.photos?.find((photo) => photo.is_front_cover) ?? item.photos?.[0];
  const price = item.operations
    ?.flatMap((operation) => operation.prices ?? [])
    .find((value) => typeof value.price === "number");
  const title = item.publication_title?.trim() || `Propiedad ${item.id}`;
  const propertyType = item.type?.name ?? "Sin tipo";
  return {
    id: `tokko-${item.id}`,
    siteId: "tokko",
    externalId: String(item.id),
    title,
    description: item.description?.trim() ?? "",
    propertyType,
    location:
      item.location?.short_location ??
      item.location?.full_location ??
      item.location?.name ??
      "Sin ubicación",
    address: item.address ?? "",
    price: Number(price?.price ?? 0),
    currency: price?.currency ?? "USD",
    area: Number(item.total_surface ?? item.surface ?? 0),
    imageUrl: publicHttpUrlOrEmpty(cover?.image ?? cover?.thumb),
    publicUrl: publicHttpUrlOrEmpty(item.public_url),
    status: String(item.status ?? "unknown"),
    publishedAt: item.created_at ?? "",
    segment: classifyProperty({ propertyType, title }),
  };
}
