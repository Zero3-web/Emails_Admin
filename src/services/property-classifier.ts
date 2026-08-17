export type PropertySegment = "prime" | "retail" | "hub" | "unclassified";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function classifyProperty(input: { propertyType: string; title?: string }): PropertySegment {
  const type = normalize(input.propertyType);
  const title = normalize(input.title ?? "");
  // Tokko's structured type is authoritative. Some publication titles use
  // commercial wording that does not match the actual property type.
  if (type.includes("nave") || type.includes("industrial")) return "hub";
  if (type.includes("local")) return "retail";
  if (type.includes("oficina")) return "prime";
  if (title.includes("nave industrial") || title.includes("terreno industrial")) return "hub";
  if (title.startsWith("local -") || title.includes("local comercial")) return "retail";
  if (title.includes("oficina")) return "prime";
  return "unclassified";
}

export function inferSiteSegment(input: { slug: string; name: string; tokkoFilter?: Record<string, unknown> }): PropertySegment {
  const persisted = input.tokkoFilter?.segment;
  if (persisted === "prime" || persisted === "retail" || persisted === "hub") return persisted;
  const identity = normalize(`${input.slug} ${input.name}`);
  if (identity.includes("retail")) return "retail";
  if (identity.includes("hub")) return "hub";
  if (identity.includes("prime")) return "prime";
  return "unclassified";
}

export const segmentLabel = (segment: PropertySegment) => ({ prime: "Área Prime", retail: "Área Retail", hub: "Área Hub", unclassified: "Sin clasificar" })[segment];
