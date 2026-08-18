"use client";

import Link from "next/link";
import { Download, Mail, Search, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Campaign, OutboundEmailRecord, Site } from "@/src/domain/types";
import { getSiteInitials } from "@/src/components/ui";

const statusLabels: Record<Campaign["status"], string> = {
  draft: "Borrador", ready: "Lista", scheduled: "Programada", sending: "Enviando", sent: "Enviada", failed: "Fallida", cancelled: "Cancelada",
};

const emailStatusLabels: Record<string, string> = {
  sent: "Enviado", delivered: "Entregado", bounced: "Rebotado", complained: "Queja", failed: "Fallido", opened: "Abierto", clicked: "Con clics",
};

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" }).format(new Date(value)) : "Sin programar";
const displayText = (value: string) => value.replaceAll("?rea", "Área");
type TabMode = "emails" | "campaigns";

export function CampaignPerformanceTable({ campaigns, emails = [], siteById }: { campaigns: Campaign[]; emails?: OutboundEmailRecord[]; siteById: Map<string, Site> }) {
  const [tab, setTab] = useState<TabMode>("emails");
  const [query, setQuery] = useState("");
  const filteredEmails = useMemo(() => { const q = query.trim().toLocaleLowerCase("es-PE"); return q ? emails.filter((email) => `${email.recipient} ${email.subject} ${email.sender} ${email.status}`.toLocaleLowerCase("es-PE").includes(q)) : emails; }, [emails, query]);
  const filteredCampaigns = useMemo(() => { const q = query.trim().toLocaleLowerCase("es-PE"); return q ? campaigns.filter((campaign) => `${displayText(campaign.name)} ${displayText(campaign.subject)} ${statusLabels[campaign.status]}`.toLocaleLowerCase("es-PE").includes(q)) : campaigns; }, [campaigns, query]);

  function downloadCsv(csvContent: string, fileName: string) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" }));
    link.download = fileName; link.click(); URL.revokeObjectURL(link.href);
  }

  function exportRows() {
    const rows = tab === "emails"
      ? filteredEmails.map((email) => [formatDate(email.date), email.recipient, email.subject, emailStatusLabels[email.status] ?? email.status, `${email.deliveredRate.toFixed(1)}%`])
      : filteredCampaigns.map((campaign) => [formatDate(campaign.sentAt ?? campaign.scheduledAt), displayText(campaign.name), displayText(campaign.subject), campaign.recipientCount, statusLabels[campaign.status]]);
    const headings = tab === "emails" ? ["Fecha", "Destinatario", "Asunto", "Estado", "Entrega"] : ["Fecha", "Campaña", "Asunto", "Destinatarios", "Estado"];
    const csv = [headings, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    downloadCsv(csv, tab === "emails" ? "actividad-correos-area-mail.csv" : "actividad-campanas-area-mail.csv");
  }

  const hasRows = tab === "emails" ? filteredEmails.length > 0 : filteredCampaigns.length > 0;

  return (
    <section className="up-card up-email-performance aep-container dashboard-activity">
      <header className="aep-header dashboard-activity-head">
        <div className="dashboard-activity-title"><strong>Actividad reciente</strong><span>Últimos correos y campañas registrados</span></div>
        <div className={`aep-tabs is-${tab}`} role="tablist" aria-label="Tipo de actividad">
          <button id="dashboard-tab-emails" type="button" role="tab" aria-controls="dashboard-panel-emails" aria-selected={tab === "emails"} className={`aep-tab ${tab === "emails" ? "active" : ""}`} onClick={() => { setTab("emails"); setQuery(""); }}>Correos <span className="aep-badge">{emails.length}</span></button>
          <button id="dashboard-tab-campaigns" type="button" role="tab" aria-controls="dashboard-panel-campaigns" aria-selected={tab === "campaigns"} className={`aep-tab ${tab === "campaigns" ? "active" : ""}`} onClick={() => { setTab("campaigns"); setQuery(""); }}>Campañas <span className="aep-badge">{campaigns.length}</span></button>
        </div>
        <div className="aep-actions">
          <label className="aep-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${tab === "emails" ? "correos" : "campañas"}`} aria-label="Buscar actividad" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda"><X size={13} /></button>}</label>
          <button type="button" className="aep-export-btn" onClick={exportRows} disabled={!hasRows}><Download size={14} /><span>Exportar</span></button>
        </div>
      </header>

      <div id={`dashboard-panel-${tab}`} className={`aep-table-wrap dashboard-activity-content mode-${tab}`} role="tabpanel" aria-labelledby={`dashboard-tab-${tab}`} key={tab}>
        {tab === "emails" ? (
          filteredEmails.length ? <table className="aep-table dashboard-activity-table"><thead><tr><th>Fecha</th><th>Destinatario</th><th>Asunto</th><th>Estado</th><th>Entrega</th></tr></thead><tbody>{filteredEmails.map((email) => <tr key={email.id}><td className="aep-date-cell">{formatDate(email.date)}</td><td><div className="dashboard-email-person"><span>{(email.recipient || "U").slice(0, 1).toUpperCase()}</span><strong>{email.recipient}</strong></div></td><td><span className="dashboard-subject">{displayText(email.subject || "Sin asunto")}</span></td><td><span className={`dashboard-email-status ${email.status}`}>{emailStatusLabels[email.status] ?? email.status}</span></td><td><span className={`aep-rate ${email.deliveredRate >= 90 ? "success" : "warning"}`}>{email.deliveredRate.toFixed(1)}%</span></td></tr>)}</tbody></table>
          : <ActivityEmpty icon={<Mail size={21} />} filtered={Boolean(query)} query={query} label="correos" />
        ) : filteredCampaigns.length ? <table className="aep-table dashboard-activity-table"><thead><tr><th>Fecha</th><th>Campaña</th><th>Marca</th><th>Destinatarios</th><th>Estado</th></tr></thead><tbody>{filteredCampaigns.map((campaign) => { const site = siteById.get(campaign.siteId); return <tr key={campaign.id}><td>{formatDate(campaign.sentAt ?? campaign.scheduledAt)}</td><td><Link href={`/campaigns/${campaign.id}`} className="dashboard-campaign-name"><strong>{displayText(campaign.name)}</strong><small>{displayText(campaign.subject)}</small></Link></td><td><span className="dashboard-site">{site?.logoUrl ? <img src={site.logoUrl} alt={site.name} style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover", marginRight: "6px", background: "#ffffff", display: "inline-block", verticalAlign: "middle" }} /> : <i style={{ backgroundColor: site?.primaryColor || "#4f46e5" }}>{getSiteInitials(site?.name || "AM")}</i>}{site?.name || "Marca"}</span></td><td>{campaign.recipientCount.toLocaleString("es-PE")}</td><td><span className={`up-state ${campaign.status}`}>{statusLabels[campaign.status]}</span></td></tr>; })}</tbody></table>
        : <ActivityEmpty icon={<Send size={21} />} filtered={Boolean(query)} query={query} label="campañas" />}
      </div>
    </section>
  );
}

function ActivityEmpty({ icon, filtered, query, label }: { icon: React.ReactNode; filtered: boolean; query: string; label: string }) {
  return <div className="dashboard-activity-empty"><span>{icon}</span><strong>{filtered ? `Sin resultados para “${query}”` : `Aún no hay ${label}`}</strong><p>{filtered ? "Prueba con otro término de búsqueda." : label === "correos" ? "Los envíos aparecerán aquí con su estado de entrega." : "Crea tu primer borrador para comenzar."}</p>{!filtered && <Link href="/campaigns?new=1">Crear campaña</Link>}</div>;
}
