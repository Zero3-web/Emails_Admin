"use client";

/* eslint-disable @next/next/no-img-element */
import { Check, ExternalLink, LockKeyhole, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useDialogA11y } from "@/src/hooks/use-dialog-a11y";
import { CampaignApproval } from "@/src/components/campaign-approval";
import { CampaignFilters } from "@/src/components/campaign-filters";
import { PrepareAudienceButton } from "@/src/components/prepare-audience-button";
import { EmptyState, SiteMark, StatusBadge } from "@/src/components/ui";
import type { Campaign, Site } from "@/src/domain/types";
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

  // Recipients modal state
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);
  const [recipientsList, setRecipientsList] = useState<string[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const fetchRecipients = async (campaignId: string) => {
    setShowRecipientsModal(true);
    setLoadingRecipients(true);
    setRecipientsList([]);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/recipients`);
      const data = await res.json();
      setRecipientsList(data.recipients ?? []);
    } catch {
      setRecipientsList([]);
    } finally {
      setLoadingRecipients(false);
    }
  };

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
                      <div
                        style={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          void fetchRecipients(selectedCampaign.id);
                        }}
                        title="Haz clic para ver la lista de correos destinatarios"
                      >
                        <dt style={{ color: "#4f46e5", textDecoration: "underline", fontWeight: 600 }}>Destinatarios 🔍</dt>
                        <dd style={{ fontWeight: 700, color: "#4f46e5", display: "flex", alignItems: "baseline", gap: "4px" }}>
                          {selectedCampaign.recipientCount.toLocaleString("es-PE")}
                          <span style={{ fontSize: "11px", textDecoration: "underline", opacity: 0.8 }}>(Ver lista)</span>
                        </dd>
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
                      <span className="frozen-tag" style={{ fontSize: "11px", gap: "4px" }}>
                        <LockKeyhole size={11} /> Inmutable
                      </span>
                    </div>

                    <div className="campaign-frozen-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                      {items.map((rawItem) => {
                        const item = rawItem as Record<string, any>;
                        return (
                          <article key={String(item.id)} className="card property-card" style={{ fontSize: "12px" }}>
                            <div className="property-media" style={{ height: "120px" }}>
                              <img src={String(item.imageUrl || "")} alt={String(item.title || "")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                            <div className="property-body" style={{ padding: "10px" }}>
                              <span className="frozen-type-tag" style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 700, color: "#64748b" }}>
                                {item.itemType === "property" ? String(item.propertyType || "Oficina") : "Artículo"}
                              </span>
                              <h4 style={{ margin: "4px 0", fontSize: "13px", fontWeight: 600, color: "var(--am-ink, #0f172a)", lineHeight: 1.3 }}>
                                {String(item.title || "")}
                              </h4>
                              <p style={{ margin: 0, fontSize: "11px", color: "var(--muted, #64748b)" }}>
                                {item.location || item.excerpt ? String(item.location || item.excerpt) : ""}
                              </p>
                              {item.price && (
                                <strong style={{ display: "block", marginTop: "6px", fontSize: "12px", color: "var(--am-ink, #0f172a)" }}>
                                  USD {Number(item.price).toLocaleString("es-PE")}
                                </strong>
                              )}
                              <a
                                href={String(item.publicUrl || item.url || "#")}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "8px", fontSize: "11px", color: "#4f46e5", textDecoration: "none", fontWeight: 600 }}
                              >
                                Ver publicación <ExternalLink size={11} />
                              </a>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                </main>

                <aside>
                  <CampaignApproval campaign={selectedCampaign} canApprove={canApprove} />
                </aside>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Lista de Destinatarios */}
      {showRecipientsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setShowRecipientsModal(false)}
        >
          <div
            style={{
              background: "var(--am-surface, #ffffff)",
              borderRadius: "14px",
              padding: "20px 24px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "var(--am-ink, #0f172a)" }}>
                Lista de Destinatarios ({recipientsList.length})
              </h3>
              <button
                onClick={() => setShowRecipientsModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            {loadingRecipients ? (
              <p style={{ fontSize: "13px", color: "var(--muted, #64748b)" }}>Cargando correos destinatarios...</p>
            ) : recipientsList.length > 0 ? (
              <ul
                style={{
                  margin: 0,
                  padding: "0 0 0 16px",
                  fontSize: "13px",
                  color: "var(--am-ink, #334155)",
                  overflowY: "auto",
                  maxHeight: "360px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {recipientsList.map((email, idx) => (
                  <li key={idx} style={{ fontFamily: "monospace", fontSize: "12px", background: "var(--am-surface-2, #f8fafc)", padding: "6px 10px", borderRadius: "6px", listStyle: "none" }}>
                    ✉️ {email}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: "13px", color: "var(--muted, #64748b)" }}>No se encontraron correos destinatarios.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
