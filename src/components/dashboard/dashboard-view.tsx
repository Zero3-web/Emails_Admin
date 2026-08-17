import Link from "next/link";
import { ArrowRight, Check, CircleAlert, FileText, Plus, UsersRound } from "lucide-react";
import type { Campaign, OutboundEmailRecord, Site } from "@/src/domain/types";
import { CampaignPerformanceTable } from "./campaign-performance-table";
import { MetricCard } from "./metric-card";
import { PerformanceChart } from "./performance-chart";

type DashboardViewProps = {
  sites: Site[];
  campaigns: Campaign[];
  emails?: OutboundEmailRecord[];
  totalDelivered: number;
  activeContacts: number;
};

export function DashboardView({ sites, campaigns, emails = [], totalDelivered, activeContacts }: DashboardViewProps) {
  const siteById = new Map(sites.map((site) => [site.id, site]));
  const sentCampaigns = campaigns.filter((campaign) => campaign.status === "sent");
  const draftCampaigns = campaigns.filter((campaign) => campaign.status === "draft" || campaign.status === "ready");
  const failedCampaigns = campaigns.filter((campaign) => campaign.status === "failed");
  const deliveryRate = emails.length ? Math.round(emails.reduce((sum, email) => sum + email.deliveredRate, 0) / emails.length) : 0;
  const needsAudience = activeContacts === 0;
  const nextCampaign = draftCampaigns[0];

  return (
    <div className="up-dashboard dashboard-workspace">
      <header className="minimal-page-head dashboard-head">
        <div><h1>Resumen</h1><p>Estado de tus campañas, audiencia y entregas.</p></div>
        <Link href="/campaigns?new=1" className="up-primary"><Plus size={15} />Nueva campaña</Link>
      </header>

      <section className="up-metrics dashboard-metrics" aria-label="Indicadores principales">
        <MetricCard label="Contactos activos" value={activeContacts} note={activeContacts ? "Disponibles para segmentar" : "Necesitas agregar audiencia"} kind="audience" href="/contacts" attention={needsAudience} />
        <MetricCard label="Borradores" value={draftCampaigns.length} note={draftCampaigns.length ? "Pendientes de completar" : "No hay trabajo pendiente"} kind="drafts" href="/campaigns" />
        <MetricCard label="Campañas enviadas" value={sentCampaigns.length} note={`${totalDelivered.toLocaleString("es-PE")} ${totalDelivered === 1 ? "correo entregado" : "correos entregados"}`} kind="sent" />
        <MetricCard label="Tasa de entrega" value={deliveryRate} suffix="%" note={emails.length ? "Promedio de correos registrados" : "Sin envíos suficientes"} kind="delivery" />
      </section>

      {needsAudience ? (
        <section className="dashboard-next-step">
          <span className="dashboard-next-icon"><UsersRound size={20} /></span>
          <div><span>Siguiente paso recomendado</span><h2>Agrega contactos antes de crear tu próxima campaña</h2><p>Las campañas necesitan una audiencia activa y con consentimiento. Puedes importar un CSV y clasificarlo por marca e interés.</p></div>
          <Link href="/contacts" className="btn primary">Preparar audiencia <ArrowRight size={15} /></Link>
        </section>
      ) : nextCampaign ? (
        <section className="dashboard-next-step ready">
          <span className="dashboard-next-icon"><FileText size={20} /></span>
          <div><span>Continúa donde lo dejaste</span><h2>{nextCampaign.name}</h2><p>Este borrador está listo para que revises contenido, audiencia y aprobación.</p></div>
          <Link href={`/campaigns/${nextCampaign.id}`} className="btn primary">Revisar borrador <ArrowRight size={15} /></Link>
        </section>
      ) : null}

      <div className="dashboard-insight-grid">
        <PerformanceChart campaigns={sentCampaigns} />
        <section className="up-card dashboard-readiness">
          <header><div><strong>Preparación para enviar</strong><span>Revisión rápida de tu cuenta</span></div></header>
          <div className="dashboard-readiness-list">
            <div className={activeContacts > 0 ? "complete" : "pending"}><span>{activeContacts > 0 ? <Check size={14} /> : <CircleAlert size={14} />}</span><div><strong>Audiencia</strong><small>{activeContacts > 0 ? `${activeContacts.toLocaleString("es-PE")} contactos activos` : "Importa contactos con consentimiento"}</small></div>{activeContacts === 0 && <Link href="/contacts">Resolver</Link>}</div>
            <div className={draftCampaigns.length > 0 ? "complete" : "neutral"}><span>{draftCampaigns.length > 0 ? <Check size={14} /> : <FileText size={14} />}</span><div><strong>Contenido</strong><small>{draftCampaigns.length > 0 ? `${draftCampaigns.length} borradores disponibles` : "Crea tu primer borrador"}</small></div>{draftCampaigns.length === 0 && <Link href="/campaigns?new=1">Crear</Link>}</div>
            <div className={failedCampaigns.length ? "pending" : "complete"}><span>{failedCampaigns.length ? <CircleAlert size={14} /> : <Check size={14} />}</span><div><strong>Entregabilidad</strong><small>{failedCampaigns.length ? `${failedCampaigns.length} campañas con error` : "Sin incidencias registradas"}</small></div>{failedCampaigns.length > 0 && <Link href="/activity">Revisar</Link>}</div>
          </div>
        </section>
      </div>

      <CampaignPerformanceTable campaigns={campaigns} emails={emails} siteById={siteById} />
    </div>
  );
}
