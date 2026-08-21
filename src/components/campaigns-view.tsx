"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Check, ExternalLink, LockKeyhole, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useDialogA11y } from "@/src/hooks/use-dialog-a11y";
import { CampaignApproval } from "@/src/components/campaign-approval";
import { CampaignFilters } from "@/src/components/campaign-filters";
import { PrepareAudienceButton } from "@/src/components/prepare-audience-button";
import { EmptyState, SiteMark, StatusBadge } from "@/src/components/ui";
import type { BlogPost, Campaign, Contact, Property, Site } from "@/src/domain/types";
import { campaignStages, getCampaignProgress } from "@/src/services/campaign-state";

const labels = {
  weekly_new_properties: "Nuevas oficinas",
  monthly_properties: "Oficinas mensuales",
  monthly_blog: "Blog mensual",
};

const fullLabels = {
  weekly_new_properties: "Nuevas oficinas de la semana",
  monthly_properties: "Oficinas disponibles",
  monthly_blog: "Novedades del blog",
};

const audienceLabels = {
  prime: "Oficinas",
  retail: "Locales comerciales",
  hub: "Industrial",
};

export function CampaignsView({
  campaigns,
  sites,
  canApprove,
  initialQuery = "",
  initialType = "",
  initialStatus = "",
  initialSite = "",
}: {
  campaigns: Campaign[];
  sites: Site[];
  canApprove: boolean;
  initialQuery?: string;
  initialType?: string;
  initialStatus?: string;
  initialSite?: string;
}) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);

  const visibleSites = useMemo(() => (initialSite ? sites.filter((site) => site.id === initialSite) : sites), [sites, initialSite]);

  const rows = useMemo(
    () =>
      campaigns.filter(
        (campaign) =>
          visibleSites.some((site) => site.id === campaign.siteId) &&
          (!initialStatus || campaign.status === initialStatus) &&
          (!initialType || campaign.automationType === initialType) &&
          (!initialQuery || campaign.name.toLowerCase().includes(initialQuery.toLowerCase()))
      ),
    [campaigns, visibleSites, initialStatus, initialType, initialQuery]
  );

  const selectedCampaign = useMemo(() => campaigns.find((c) => c.id === selectedCampaignId) ?? null, [campaigns, selectedCampaignId]);
  const selectedSite = useMemo(() => (selectedCampaign ? siteById.get(selectedCampaign.siteId) : null), [selectedCampaign, siteById]);

  const dialogRef = useDialogA11y<HTMLDivElement>(Boolean(selectedCampaign), () => setSelectedCampaignId(null));

  const items = selectedCampaign?.metadata?.items ?? [];
  const progress: Record<string, boolean> = selectedCampaign ? getCampaignProgress(selectedCampaign.recipientCount, selectedCampaign.status) : { content: false, audience: false, approval: false, test: false, send: false };
  const currentStage = campaignStages.find((stage) => !progress[stage.id])?.id;
  const audience = selectedCampaign?.metadata?.audience;
  const displaySubject = selectedCampaign?.subject?.replaceAll("?rea", "Área") ?? "";

  return (
    <>
      <CampaignFilters initialQuery={initialQuery} initialType={initialType} initialStatus={initialStatus} resultCount={rows.length} />

      {rows.length ? (
        <div className="card table-wrap responsive-table">
          <table>
            <thead>
              <tr>
                <th>Marca</th>
                <th>Campaña</th>
                <th>Tipo</th>
                <th>Contenido</th>
                <th>Destinatarios</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((campaign) => {
                const site = siteById.get(campaign.siteId)!;
                return (
                  <tr
                    key={campaign.id}
                    onClick={() => setSelectedCampaignId(campaign.id)}
                    style={{ cursor: "pointer" }}
                    title="Haz clic para ver el detalle y contenido congelado"
                  >
                    <td data-label="Marca">
                      <span className="brand-cell">
                        <SiteMark site={site} small />
                        {site.name}
                      </span>
                    </td>
                    <td data-label="Campaña">
                      <strong style={{ color: "var(--am-ink, #0f172a)" }}>{campaign.name}</strong>
                    </td>
                    <td data-label="Tipo">{labels[campaign.automationType]}</td>
                    <td data-label="Contenido">{campaign.metadata?.items?.length ?? 0} elementos</td>
                    <td data-label="Destinatarios">{campaign.recipientCount.toLocaleString("es-PE")}</td>
                    <td data-label="Estado">
                      <StatusBadge status={campaign.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title={initialQuery || initialType || initialStatus ? "No encontramos campañas" : "Todavía no hay campañas"}
          description={
            initialQuery || initialType || initialStatus
              ? "Prueba otra búsqueda o limpia los filtros aplicados."
              : "Crea el primer borrador seleccionando contenido real de Área Prime."
          }
        />
      )}

      {/* Modal de Detalle de Campaña */}
      {selectedCampaign && selectedSite && (
        <div
          className="dialog-backdrop"
          onClick={() => setSelectedCampaignId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            ref={dialogRef}
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "960px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              background: "var(--am-surface, #ffffff)",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid var(--am-border, #e2e8f0)",
            }}
          >
            {/* Modal Header */}
            <header
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--am-border, #e2e8f0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--am-surface-2, #f8fafc)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <SiteMark site={selectedSite} small />
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--am-ink, #0f172a)" }}>
                    {selectedCampaign.name}
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>{displaySubject}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <StatusBadge status={selectedCampaign.status} />
                <button
                  type="button"
                  onClick={() => setSelectedCampaignId(null)}
                  className="btn subtle"
                  style={{ padding: "6px", borderRadius: "8px" }}
                  aria-label="Cerrar modal"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            {/* Modal Content */}
            <div style={{ padding: "20px", overflowY: "auto" }}>
              <div className="campaign-detail-grid" style={{ gridTemplateColumns: "1fr 300px", gap: "20px" }}>
                <main>
                  <section className="card campaign-overview" style={{ padding: "16px", marginBottom: "16px" }}>
                    <div className="campaign-overview-brand">
                      <SiteMark site={selectedSite} />
                      <div>
                        <span>Marca y remitente</span>
                        <strong>{selectedSite.name}</strong>
                        <small>
                          {selectedSite.senderName} · {selectedSite.senderEmail}
                        </small>
                      </div>
                    </div>
                    <dl style={{ margin: "12px 0 0" }}>
                      <div>
                        <dt>Plantilla</dt>
                        <dd>{fullLabels[selectedCampaign.automationType]}</dd>
                      </div>
                      <div>
                        <dt>Contenido</dt>
                        <dd>{items.length} elementos</dd>
                      </div>
                      <div>
                        <dt>Destinatarios</dt>
                        <dd>{selectedCampaign.recipientCount.toLocaleString("es-PE")}</dd>
                      </div>
                      <div>
                        <dt>Creación</dt>
                        <dd>
                          {selectedCampaign.metadata?.frozenAt
                            ? new Date(selectedCampaign.metadata.frozenAt).toLocaleString("es-PE")
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                    {selectedCampaign.metadata?.introduction && (
                      <div className="campaign-introduction" style={{ marginTop: "12px" }}>
                        <span>Introducción</span>
                        <p>{selectedCampaign.metadata.introduction}</p>
                      </div>
                    )}
                    {!selectedCampaign.recipientCount && (
                      <div className="campaign-readiness-note" style={{ marginTop: "12px" }}>
                        <span>
                          <UsersRound size={16} />
                        </span>
                        <div>
                          <strong>Esta campaña todavía no tiene destinatarios</strong>
                          <p>Agrega contactos con consentimiento para habilitar la aprobación.</p>
                        </div>
                        <PrepareAudienceButton campaignId={selectedCampaign.id} siteId={selectedCampaign.siteId} interest={audience?.interest ?? "prime"} />
                      </div>
                    )}
                  </section>

                  <section className="campaign-frozen">
                    <div className="section-head" style={{ marginBottom: "12px" }}>
                      <div>
                        <h2 className="section-title" style={{ fontSize: "14px" }}>
                          Contenido congelado
                        </h2>
                        <p className="subtitle" style={{ fontSize: "11px" }}>
                          Copia inmutable de la campaña.
                        </p>
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
                              <p>
                                {item.location}
                                {item.area ? ` · ${item.area} m²` : ""}
                              </p>
                            ) : (
                              <p>{item.excerpt}</p>
                            )}
                            <footer>
                              {item.itemType === "property" && (
                                <strong>
                                  {item.price ? `${item.currency} ${item.price.toLocaleString("es-PE")}` : "Precio a consultar"}
                                </strong>
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

                <aside className="card campaign-actions" style={{ padding: "16px" }}>
                  <header>
                    <span>Estado del flujo</span>
                    <strong>
                      {selectedCampaign.status === "sent"
                        ? "Campaña enviada"
                        : selectedCampaign.status === "scheduled"
                        ? "Envío programado"
                        : selectedCampaign.status === "sending"
                        ? "Enviando campaña"
                        : `Siguiente paso: ${
                            selectedCampaign.status === "ready"
                              ? "probar o enviar"
                              : selectedCampaign.recipientCount
                              ? "aprobar la campaña"
                              : "preparar la audiencia"
                          }`}
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
                  <CampaignApproval
                    campaign={selectedCampaign}
                    canApprove={canApprove}
                    onDeleted={() => setSelectedCampaignId(null)}
                  />
                </aside>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
