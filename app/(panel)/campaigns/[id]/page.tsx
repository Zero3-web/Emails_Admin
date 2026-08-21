import { notFound } from "next/navigation";
/* eslint-disable @next/next/no-img-element -- Frozen campaign snapshots retain their external source image. */
import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, LockKeyhole, UsersRound } from "lucide-react";
import { CampaignEmailPreviewModalButton } from "@/src/components/campaign-email-preview";
import { PageHeader, SiteMark, StatusBadge } from "@/src/components/ui";
import { CampaignApproval } from "@/src/components/campaign-approval";
import { PrepareAudienceButton } from "@/src/components/prepare-audience-button";
import { requirePanelAccess } from "@/src/auth/server";
import { getCampaigns, getSites } from "@/src/database/repositories";
import { campaignStages, getCampaignProgress } from "@/src/services/campaign-state";

const labels = { weekly_new_properties: "Nuevas oficinas de la semana", monthly_properties: "Oficinas disponibles", monthly_blog: "Novedades del blog" };
const audienceLabels = { prime: "Oficinas", retail: "Locales comerciales", hub: "Industrial" };

export default async function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaigns, sites, access] = await Promise.all([getCampaigns(), getSites(), requirePanelAccess()]);
  const campaign = campaigns.find((item) => item.id === id);
  if (!campaign) notFound();
  const site = sites.find((item) => item.id === campaign.siteId);
  if (!site) notFound();
  const items = campaign.metadata?.items ?? [];
  const progress = getCampaignProgress(campaign.recipientCount, campaign.status);
  const currentStage = campaignStages.find((stage) => !progress[stage.id])?.id;
  const membership = access.memberships.find((item) => item.siteId === campaign.siteId);
  const canApprove = access.platformOwner || membership?.role === "site_admin" || membership?.role === "approver";
  const audience = campaign.metadata?.audience;
  const displaySubject = campaign.subject.replaceAll("?rea", "Área");

  return (
    <div className="campaign-detail-page">
      <PageHeader
        eyebrow="Campaña"
        title={campaign.name}
        description={displaySubject}
        action={
          <div className="campaign-header-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CampaignEmailPreviewModalButton
              siteName={site.name}
              senderEmail={site.senderEmail}
              subject={displaySubject}
              introduction={campaign.metadata?.introduction}
              items={items}
              recipientCount={campaign.recipientCount}
            />
            <Link href="/campaigns">
              <ArrowLeft size={14} /> Volver a campañas
            </Link>
            <StatusBadge status={campaign.status} />
          </div>
        }
      />

      <div className="campaign-detail-grid">
        <main>
          <section className="card campaign-overview">
            <div className="campaign-overview-brand">
              <SiteMark site={site} />
              <div>
                <span>Marca y remitente</span>
                <strong>{site.name}</strong>
                <small>{site.senderName} · {site.senderEmail}</small>
              </div>
            </div>
            <dl>
              <div><dt>Plantilla</dt><dd>{labels[campaign.automationType]}</dd></div>
              <div><dt>Contenido</dt><dd>{items.length} elementos</dd></div>
              <div><dt>Destinatarios</dt><dd>{campaign.recipientCount.toLocaleString("es-PE")}</dd></div>
              <div><dt>Creación</dt><dd>{campaign.metadata?.frozenAt ? new Date(campaign.metadata.frozenAt).toLocaleString("es-PE") : "—"}</dd></div>
            </dl>
            {campaign.metadata?.introduction && (
              <div className="campaign-introduction">
                <span>Introducción</span>
                <p>{campaign.metadata.introduction}</p>
              </div>
            )}
            {!campaign.recipientCount && (
              <div className="campaign-readiness-note">
                <span><UsersRound size={16} /></span>
                <div>
                  <strong>Esta campaña todavía no tiene destinatarios</strong>
                  <p>Agrega contactos con consentimiento para habilitar la aprobación.</p>
                </div>
                <PrepareAudienceButton campaignId={campaign.id} siteId={campaign.siteId} interest={audience?.interest ?? "prime"} />
              </div>
            )}
          </section>

          <section className="campaign-frozen">
            <div className="section-head">
              <div>
                <h2 className="section-title">Contenido congelado</h2>
                <p className="subtitle">Esta copia no cambiará cuando Tokko o WordPress se actualicen.</p>
              </div>
              <span className="frozen-badge">
                <LockKeyhole size={13} /> Inmutable
              </span>
            </div>
            <div className="campaign-frozen-grid">
              {items.map((item) => (
                <article className="card campaign-frozen-item" key={item.id}>
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <div className="campaign-frozen-placeholder" />}
                  <div>
                    <span>{item.itemType === "property" ? "Oficina" : "Artículo"}</span>
                    <h3>{item.title}</h3>
                    {item.itemType === "property" ? (
                      <p>{item.location}{item.area ? ` · ${item.area} m²` : ""}</p>
                    ) : (
                      <p>{item.excerpt}</p>
                    )}
                    <footer>
                      {item.itemType === "property" && (
                        <strong>{item.price ? `${item.currency} ${item.price.toLocaleString("es-PE")}` : "Precio a consultar"}</strong>
                      )}
                      <a href={item.publicUrl} target="_blank" rel="noreferrer">
                        Ver publicación <ExternalLink size={13} />
                      </a>
                    </footer>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="card campaign-actions">
          <header>
            <span>Estado del flujo</span>
            <strong>
              {campaign.status === "sent"
                ? "Campaña enviada"
                : campaign.status === "scheduled"
                  ? "Envío programado"
                  : campaign.status === "sending"
                    ? "Enviando campaña"
                    : `Siguiente paso: ${campaign.status === "ready" ? "probar o enviar" : campaign.recipientCount ? "aprobar la campaña" : "preparar la audiencia"}`}
            </strong>
          </header>
          <div className="campaign-stepper" aria-label="Progreso de la campaña">
            {campaignStages.map((stage, index) => (
              <div className={progress[stage.id] ? "complete" : currentStage === stage.id ? "current" : "pending"} key={stage.id}>
                <span>{progress[stage.id] ? <Check size={12} /> : index + 1}</span>
                <strong>{stage.label}</strong>
              </div>
            ))}
          </div>
          <CampaignApproval campaign={campaign} canApprove={canApprove} />
          
          
        </aside>
      </div>
    </div>
  );
}
