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
}): PropertySegment {
  const type = normalize(input.propertyType);
  const title = normalize(input.title ?? "");

  // Tokko structured types & titles for Area Hub (Naves industriales, terrenos industriales, almacenes, depósitos)
  if (
    type.includes("nave") ||
    type.includes("industrial") ||
    type.includes("terreno") ||
    type.includes("almacen") ||
    type.includes("deposito") ||
    type.includes("logistico")
  ) {
    return "hub";
  }

  // Area Retail (Locales comerciales)
  if (type.includes("local") || type.includes("comercial")) {
    return "retail";
  }

  // Area Prime (Oficinas corporativas)
  if (type.includes("oficina")) {
    return "prime";
  }

  // Fallback checks on title keywords
  if (
    title.includes("nave") ||
    title.includes("terreno industrial") ||
    title.includes("terreno") ||
    title.includes("industrial") ||
    title.includes("almacen") ||
    title.includes("deposito") ||
    title.includes("logistico")
  ) {
    return "hub";
  }

  if (title.includes("local") || title.includes("comercial")) {
    return "retail";
  }

  if (title.includes("oficina")) {
    return "prime";
  }

  return "unclassified";
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
  )
    return persisted;
  const identity = normalize(`${input.slug} ${input.name}`);
  if (identity.includes("retail")) return "retail";
  if (identity.includes("hub")) return "hub";
  if (identity.includes("prime")) return "prime";
  return "unclassified";
}

export const segmentLabel = (segment: PropertySegment) =>
  ({
    prime: "Área Prime",
    retail: "Área Retail",
    hub: "Área Hub",
    unclassified: "Sin clasificar",
  })[segment];
