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
import { renderCampaignEmail } from "@/src/services/email-renderer";
import type { BlogPost, Property } from "@/src/domain/types";

const labels = { weekly_new_properties: "Nuevas oficinas de la semana", monthly_properties: "Oficinas disponibles", monthly_blog: "Novedades del blog" };

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
  const previewItems = items.map((item) => item.itemType === "blog_post"
    ? ({ id: item.id, siteId: site.id, externalId: item.externalId, title: item.title, excerpt: item.excerpt ?? "", imageUrl: item.imageUrl, publicUrl: item.publicUrl, publishedAt: "" } satisfies BlogPost)
    : ({ id: item.id, siteId: site.id, externalId: item.externalId, title: item.title, description: "", propertyType: "", location: item.location ?? "", address: "", price: item.price ?? 0, currency: item.currency ?? "USD", area: item.area ?? 0, imageUrl: item.imageUrl, publicUrl: item.publicUrl, status: "", publishedAt: "", segment: campaign.siteId === "prime" ? "prime" : campaign.siteId === "hub" ? "hub" : campaign.siteId === "retail" ? "retail" : "unclassified" } satisfies Property));
  const previewHtml = await renderCampaignEmail(site, campaign.automationType, previewItems, { preview: true });

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
              html={previewHtml}
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
            <div className="section-head" style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 className="section-title" style={{ fontSize: "14px", margin: 0, fontWeight: 700 }}>Contenido congelado</h2>
                <p className="subtitle" style={{ fontSize: "11px", margin: "2px 0 0", color: "#64748b" }}>Esta copia no cambiará cuando Tokko o WordPress se actualicen.</p>
              </div>
              <span className="frozen-badge" style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", color: "#475569", fontWeight: 600 }}>
                <LockKeyhole size={13} /> Inmutable
              </span>
            </div>
            <div className="campaign-frozen-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
              {items.map((item) => (
                <article key={item.id} style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ height: "130px", width: "100%", overflow: "hidden", background: "#f8fafc", position: "relative" }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#94a3b8", fontSize: "11px" }}>Sin imagen</div>
                    )}
                  </div>
                  <div style={{ padding: "12px", display: "flex", flexDirection: "column", flex: 1, gap: "6px" }}>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em", color: "#4f46e5", display: "block" }}>
                      {item.itemType === "property" ? "Oficina" : "Artículo"}
                    </span>
                    <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#0f172a", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {item.title}
                    </h4>
                    {item.itemType === "property" ? (
                      <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {item.location}{item.area ? ` · ${item.area} m²` : ""}
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {item.excerpt}
                      </p>
                    )}
                    <div style={{ marginTop: "auto", paddingTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", borderTop: "1px solid #f1f5f9" }}>
                      {item.itemType === "property" ? (
                        <strong style={{ fontSize: "12px", color: "#0f172a", fontWeight: 700 }}>
                          {item.price ? `${item.currency} ${item.price.toLocaleString("es-PE")}` : "Precio a consultar"}
                        </strong>
                      ) : (
                        <span />
                      )}
                      <a
                        href={item.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#4f46e5", textDecoration: "none", fontWeight: 600 }}
                      >
                        Ver publicación <ExternalLink size={11} />
                      </a>
                    </div>
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
