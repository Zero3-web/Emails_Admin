import Link from "next/link";
import { Inbox } from "lucide-react";
export { Button } from "./ui/button";
import type {
  CampaignStatus,
  IntegrationStatus,
  Integration,
  Site,
} from "@/src/domain/types";
export function PageHeader({
  title,
  description,
  action,
  eyebrow = "Panel central",
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="subtitle">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function getSiteInitials(name: string): string {
  const clean = (name || "").trim().toLowerCase();
  if (clean.includes("todas") || clean.includes("all")) return "AM";
  if (clean.includes("prime")) return "AP";
  if (clean.includes("hub")) return "AH";
  if (clean.includes("retail")) return "AR";
  
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return (words[0] || "AM").slice(0, 2).toUpperCase();
}

export function SiteMark({
  site,
  small = false,
}: {
  site: Site;
  small?: boolean;
}) {
  const initials = getSiteInitials(site.name);
  if (site.logoUrl) {
    return (
      <img
        src={site.logoUrl}
        alt={site.name}
        className={small ? "mini-logo" : "site-logo"}
        style={{ objectFit: "cover", background: "#ffffff" }}
      />
    );
  }
  return (
    <span
      className={small ? "mini-logo" : "site-logo"}
      style={{ background: "#ccff00", color: "#000000", fontWeight: 800 }}
    >
      {initials}
    </span>
  );
}
export function StatusBadge({
  status,
}: {
  status: CampaignStatus | IntegrationStatus | string;
}) {
  const labels: Record<string, string> = {
    sent: "Enviada",
    scheduled: "Programada",
    draft: "Borrador",
    failed: "Fallida",
    ready: "Lista",
    pending: "Pendiente",
    connected: "Conectado",
    error: "Error",
    disabled: "Desactivado",
    success: "Correcto",
    warning: "Atención",
  };
  return <span className={`badge ${status}`}>{labels[status] ?? status}</span>;
}
export function SiteCard({ site }: { site: Site }) {
  return (
    <article className="card site-card">
      <div className="site-card-top">
        <SiteMark site={site} />
        <StatusBadge status={site.isActive ? "connected" : "disabled"} />
      </div>
      <h3 className="site-name">{site.name}</h3>
      <div className="site-type">{site.description}</div>
      <Link
        className="btn"
        style={{ width: "100%", marginTop: 12 }}
        href={`/sites/${site.id}`}
      >
        Administrar
      </Link>
    </article>
  );
}
export function DashboardSiteCard({ site, integrations }: { site: Site; integrations: Integration[] }) {
  const connected = integrations.filter((item) => item.status === "connected").length;
  const hasError = integrations.some((item) => item.status === "error");
  return (
    <article className="card dashboard-site-card">
      <div className="dashboard-site-heading">
        <SiteMark site={site} small />
        <div className="dashboard-site-copy">
          <h3>{site.name}</h3>
          <span className="dashboard-site-type">{site.businessType}</span>
        </div>
        <StatusBadge status={hasError ? "error" : connected === integrations.length && integrations.length ? "connected" : "pending"} />
      </div>
      <div className="integration-summary">
        <span>{connected}/{integrations.length} integraciones conectadas</span>
        <Link href={`/sites/${site.id}`}>Gestionar <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}

export function EmptyState({
  title = "Todavía no hay datos",
  description = "La información aparecerá aquí cuando esté disponible.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card empty">
      <span className="empty-icon"><Inbox size={19} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}
