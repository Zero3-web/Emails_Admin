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
  const type = normalize(input.propertyType || "");
  const title = normalize(input.title || "");

  // 1. Strict check: Any property with office in title or type MUST be prime
  if (title.includes("oficina") || type.includes("oficina") || title.includes("corporativ") || type.includes("corporativ")) {
    return "prime";
  }

  // 2. Strict check: Any industrial property MUST be hub
  if (
    type.includes("nave") ||
    type.includes("industrial") ||
    type.includes("terreno") ||
    type.includes("almacen") ||
    type.includes("deposito") ||
    type.includes("bodega") ||
    type.includes("logistico") ||
    type.includes("parque") ||
    title.includes("nave") ||
    title.includes("industrial") ||
    title.includes("almacen") ||
    title.includes("deposito") ||
    title.includes("bodega") ||
    title.includes("logistico")
  ) {
    return "hub";
  }

  // 3. Strict check: Retail commercial stores
  if (
    type.includes("local") ||
    type.includes("tienda") ||
    type.includes("comercial") ||
    type.includes("stand") ||
    title.includes("local") ||
    title.includes("tienda") ||
    title.includes("retail") ||
    title.includes("comercial") ||
    title.includes("stand")
  ) {
    return "retail";
  }

  return "prime";
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
