"use client";

/* eslint-disable @next/next/no-img-element */
import { Check, CheckCircle2, ExternalLink, Eye, Loader2, LockKeyhole, MoreVertical, Send, Trash2, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDialogA11y } from "@/src/hooks/use-dialog-a11y";
import { CampaignApproval } from "@/src/components/campaign-approval";
import { CampaignFilters } from "@/src/components/campaign-filters";
import { PrepareAudienceButton } from "@/src/components/prepare-audience-button";
import { EmptyState, SiteMark, StatusBadge } from "@/src/components/ui";
import { SafeImage } from "@/src/components/safe-image";
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
  const router = useRouter();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
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

  const [confirmDeleteCampaign, setConfirmDeleteCampaign] = useState<{ id: string; name: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const deleteModalRef = useDialogA11y<HTMLElement>(Boolean(confirmDeleteCampaign), () => setConfirmDeleteCampaign(null));

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(null), 3600);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const handleDeleteCampaign = (e: React.MouseEvent, campaign: { id: string; name: string }) => {
    e.stopPropagation();
    setConfirmDeleteCampaign({ id: campaign.id, name: campaign.name });
  };

  const executeDeleteCampaign = async (campaignId: string) => {
    setDeletingId(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      if (selectedCampaignId === campaignId) setSelectedCampaignId(null);
      setConfirmDeleteCampaign(null);
      setToastMessage({ text: "Campaña eliminada correctamente." });
      router.refresh();
    } catch (err) {
      setToastMessage({ text: err instanceof Error ? err.message : "No se pudo eliminar la campaña.", error: true });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendCampaign = async (e: React.MouseEvent, campaignId: string) => {
    e.stopPropagation();
    setSendingId(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo enviar la campaña.");
      setToastMessage({ text: "¡Campaña enviada exitosamente!" });
      router.refresh();
    } catch (err) {
      setToastMessage({ text: err instanceof Error ? err.message : "No se pudo enviar la campaña.", error: true });
    } finally {
      setSendingId(null);
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
                <th>Fecha</th>
                <th>Estado</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((campaign) => {
                const site = siteById.get(campaign.siteId)!;
                const formattedDate = campaign.metadata?.frozenAt
                  ? new Date(campaign.metadata.frozenAt).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                  : campaign.scheduledAt
                  ? new Date(campaign.scheduledAt).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "—";
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
                    <td data-label="Fecha" style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>{formattedDate}</td>
                    <td data-label="Estado">
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td data-label="Acciones" style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "inline-block", position: "relative" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenuId === campaign.id) {
                              setOpenMenuId(null);
                              setMenuPos(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const menuHeight = 135;
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const top = spaceBelow < menuHeight ? Math.max(10, rect.top - menuHeight - 4) : rect.bottom + 4;
                              const right = Math.max(10, window.innerWidth - rect.right);
                              setOpenMenuId(campaign.id);
                              setMenuPos({ top, right });
                            }
                          }}
                          className="btn subtle"
                          style={{ padding: "6px 8px", borderRadius: "8px", color: "var(--am-ink, #475569)" }}
                          aria-label="Opciones de campaña"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === campaign.id && menuPos && (
                          <>
                            <div
                              style={{ position: "fixed", inset: 0, zIndex: 999 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                setMenuPos(null);
                              }}
                            />
                            <div
                              style={{
                                position: "fixed",
                                top: `${menuPos.top}px`,
                                right: `${menuPos.right}px`,
                                background: "var(--am-surface, #ffffff)",
                                border: "1px solid var(--am-border, #e2e8f0)",
                                borderRadius: "10px",
                                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                                padding: "4px",
                                zIndex: 1000,
                                minWidth: "160px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
                                textAlign: "left",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="btn subtle"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setMenuPos(null);
                                  setSelectedCampaignId(campaign.id);
                                }}
                                style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "flex-start", padding: "8px 12px", fontSize: "13px" }}
                              >
                                <Eye size={14} /> Ver detalles
                              </button>
                              {campaign.status !== "sent" && (
                                <button
                                  type="button"
                                  className="btn subtle"
                                  onClick={(e) => {
                                    setOpenMenuId(null);
                                    setMenuPos(null);
                                    void handleSendCampaign(e, campaign.id);
                                  }}
                                  disabled={sendingId === campaign.id}
                                  style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "flex-start", padding: "8px 12px", fontSize: "13px", color: "#4f46e5" }}
                                >
                                  {sendingId === campaign.id ? <Loader2 size={14} className="spin" /> : <Send size={14} />} Enviar ahora
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn subtle"
                                onClick={(e) => {
                                  setOpenMenuId(null);
                                  setMenuPos(null);
                                  handleDeleteCampaign(e, campaign);
                                }}
                                disabled={deletingId === campaign.id}
                                style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "flex-start", padding: "8px 12px", fontSize: "13px", color: "#ef4444" }}
                              >
                                {deletingId === campaign.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} Eliminar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
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
                    <dl style={{ margin: "12px 0 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                      <div>
                        <dt>Plantilla</dt>
                        <dd>{fullLabels[selectedCampaign.automationType]}</dd>
                      </div>
                      <div>
                        <dt>Contenido</dt>
                        <dd>{items.length} elementos</dd>
                      </div>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          void fetchRecipients(selectedCampaign.id);
                        }}
                        style={{
                          cursor: "pointer",
                          background: "#eef2ff",
                          border: "1px solid #c7d2fe",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          transition: "all 0.15s ease",
                        }}
                        title="Ver lista de destinatarios"
                      >
                        <dt style={{ fontSize: "11px", color: "#4338ca", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                          <UsersRound size={12} />
                          <span>Destinatarios</span>
                        </dt>
                        <dd style={{ fontWeight: 700, color: "#3730a3", margin: "2px 0 0", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                          {selectedCampaign.recipientCount.toLocaleString("es-PE")}
                          <span style={{ fontSize: "10px", background: "#4338ca", color: "#ffffff", padding: "1px 6px", borderRadius: "999px", fontWeight: 600 }}>Ver lista</span>
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
                    <div className="section-head" style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <h2 className="section-title" style={{ fontSize: "14px", margin: 0, fontWeight: 700 }}>
                          Contenido congelado
                        </h2>
                        <p className="subtitle" style={{ fontSize: "11px", margin: "2px 0 0", color: "#64748b" }}>
                          Copia inmutable guardada al crear la campaña.
                        </p>
                      </div>
                      <span className="frozen-tag" style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", color: "#475569", fontWeight: 600 }}>
                        <LockKeyhole size={12} /> Inmutable
                      </span>
                    </div>

                    <div className="campaign-frozen-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px", maxHeight: "440px", overflowY: "auto", paddingRight: "4px" }}>
                      {items.map((rawItem) => {
                        const item = rawItem as Record<string, any>;
                        return (
                          <article key={String(item.id)} style={{
                            display: "flex",
                            flexDirection: "column",
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            overflow: "hidden",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                          }}>
                            <div style={{ height: "110px", width: "100%", overflow: "hidden", background: "#f8fafc", position: "relative" }}>
                              <SafeImage
                                src={item.imageUrl}
                                alt={String(item.title || "")}
                                fallbackType={item.itemType === "property" ? "property" : "blog"}
                                iconSize={26}
                              />
                            </div>
                            <div style={{ padding: "12px", display: "flex", flexDirection: "column", flex: 1, gap: "6px" }}>
                              <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em", color: "#4f46e5", display: "block" }}>
                                {item.itemType === "property" ? String(item.propertyType || "Oficina") : "Artículo"}
                              </span>
                              <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#0f172a", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {String(item.title || "")}
                              </h4>
                              {item.location || item.excerpt ? (
                                <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                  {String(item.location || item.excerpt)}
                                </p>
                              ) : null}
                              <div style={{ marginTop: "auto", paddingTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", borderTop: "1px solid #f1f5f9" }}>
                                {item.price ? (
                                  <strong style={{ fontSize: "12px", color: "#0f172a", fontWeight: 700 }}>
                                    USD {Number(item.price).toLocaleString("es-PE")}
                                  </strong>
                                ) : (
                                  <span />
                                )}
                                <a
                                  href={String(item.publicUrl || item.url || "#")}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#4f46e5", textDecoration: "none", fontWeight: 600 }}
                                >
                                  Ver publicación <ExternalLink size={11} />
                                </a>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                </main>

                <aside>
                  <CampaignApproval campaign={selectedCampaign} canApprove={canApprove} onDeleted={() => setSelectedCampaignId(null)} />
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

      {/* Styled Confirmation Dialog for Deleting Campaign */}
      {confirmDeleteCampaign && (
        <div
          className="contacts-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !deletingId) setConfirmDeleteCampaign(null); }}
        >
          <section
            ref={deleteModalRef}
            className="contacts-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-campaign-delete-title"
            tabIndex={-1}
          >
            <span className="contacts-confirm-icon" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>
              <Trash2 size={20} />
            </span>
            <h2 id="confirm-campaign-delete-title">¿Eliminar campaña?</h2>
            <p>
              ¿Estás seguro de eliminar la campaña <strong>{confirmDeleteCampaign.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
              <button
                className="btn"
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setConfirmDeleteCampaign(null)}
              >
                Cancelar
              </button>
              <button
                className="btn danger"
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => void executeDeleteCampaign(confirmDeleteCampaign.id)}
              >
                {deletingId ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
                {deletingId ? "Eliminando…" : "Eliminar campaña"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Styled Floating Toast Notification */}
      {toastMessage && (
        <div className={`toast ${toastMessage.error ? "toast-error" : ""}`} role="status">
          <span>{toastMessage.error ? <X size={14} /> : <CheckCircle2 size={14} />} {toastMessage.text}</span>
          <button type="button" onClick={() => setToastMessage(null)} aria-label="Cerrar notificación"><X size={13} /></button>
        </div>
      )}
    </>
  );
}
