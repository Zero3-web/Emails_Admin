export type DomainStatus = "not_configured" | "pending" | "verified" | "error";
export type ResendDomain = { id?: string; name: string; status: DomainStatus };
