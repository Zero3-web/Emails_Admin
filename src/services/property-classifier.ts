export type PropertySegment = "prime" | "retail" | "hub" | "unclassified";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function classifyProperty(input: {
  propertyType: string;
  title?: string;
  location?: string;
  description?: string;
}): PropertySegment {
  const type = normalize(input.propertyType);
  const title = normalize(input.title ?? "");
  const loc = normalize(input.location ?? "");
  const desc = normalize(input.description ?? "");
  const combined = `${type} ${title} ${loc} ${desc}`;

  // Tokko structured types & titles for Area Hub (Naves industriales, terrenos industriales, almacenes, depósitos, bodegas)
  if (
    combined.includes("nave") ||
    combined.includes("industrial") ||
    combined.includes("terreno") ||
    combined.includes("almacen") ||
    combined.includes("deposito") ||
    combined.includes("bodega") ||
    combined.includes("logistico") ||
    combined.includes("parque")
  ) {
    return "hub";
  }

  // Area Retail (Locales comerciales)
  if (combined.includes("local") || combined.includes("comercial") || combined.includes("retail") || combined.includes("tienda") || combined.includes("stand")) {
    return "retail";
  }

  // Area Prime (Oficinas corporativas)
  if (combined.includes("oficina") || combined.includes("prime") || combined.includes("corporativ")) {
    return "prime";
  }

  return "hub"; // Fallback to hub if completely ambiguous so all brands have content options
}

export function inferSiteSegment(input: {
  slug: string;
  name: string;
  tokkoFilter?: Record<string, unknown>;
}): PropertySegment {
  const persisted = input.tokkoFilter?.segment;
  if (
    persisted === "prime" ||
    persisted === "retail" ||
    persisted === "hub"
  ) {
    return persisted;
  }
  const slug = normalize(input.slug);
  const name = normalize(input.name);
  if (slug.includes("retail") || name.includes("retail")) return "retail";
  if (slug.includes("hub") || name.includes("hub") || slug.includes("industrial")) return "hub";
  return "prime";
}

export function segmentLabel(segment: PropertySegment): string {
  if (segment === "retail") return "Area Retail";
  if (segment === "hub") return "Area Hub";
  if (segment === "prime") return "Area Prime";
  return "Sin clasificar";
}
