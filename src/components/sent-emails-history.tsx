"use client";

import { AlertCircle, CalendarDays, Check, CheckCircle2, Clock3, Eye, Mail, MousePointer, RefreshCw, Search, Send, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDialogA11y } from "@/src/hooks/use-dialog-a11y";

type SentEmailItem = { id: string; to: string; subject: string; from: string; date: string; status: string; errorMessage?: string };

const statusMeta: Record<string, { label: string; tone: "grey" | "red" }> = {
  sent: { label: "Enviado", tone: "grey" },
  delivered: { label: "Entregado", tone: "grey" },
  opened: { label: "Abierto", tone: "grey" },
  clicked: { label: "Con clic", tone: "grey" },
  queued: { label: "En cola", tone: "grey" },
  delivery_delayed: { label: "Demorado", tone: "grey" },
  bounced: { label: "Rebotado", tone: "red" },
  failed: { label: "Fallido", tone: "red" },
  suppressed: { label: "Bloqueado", tone: "red" },
  blocked: { label: "Bloqueado", tone: "red" },
  complained: { label: "Reportado", tone: "red" },
};

const normalizeStatus = (status: string) => {
  const clean = String(status || "").replace(/^email\./, "").replaceAll(".", "_").toLowerCase();
  if (clean.includes("suppress")) return "suppressed";
  if (clean.includes("bounce")) return "bounced";
  if (clean.includes("fail")) return "failed";
  if (clean.includes("block")) return "blocked";
  return clean;
};
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
};

const normalizeSite = (s?: string) => (s ?? "").toLowerCase().replace(/^area-?/, "");

export function SentEmailsHistory({ initialSite = "all" }: { initialSite?: string }) {
  const [items, setItems] = useState<SentEmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState(initialSite);
  const [query, setQuery] = useState("");
  const [animatingFilter, setAnimatingFilter] = useState(false);

  useEffect(() => {
    setSiteFilter(initialSite);
  }, [initialSite]);

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<SentEmailItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<{ id?: string; html?: string; text?: string; from?: string; to?: string[]; subject?: string; created_at?: string; status?: string } | null>(null);

  const modalRef = useDialogA11y<HTMLDivElement>(Boolean(selectedItem), () => setSelectedItem(null));

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/resend/emails", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo consultar la actividad.");
      setItems(payload.emails ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo consultar la actividad.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const openDetail = async (item: SentEmailItem) => {
    setSelectedItem(item);
    setDetailLoading(true);
    setDetailData({
      id: item.id,
      to: [item.to],
      from: item.from,
      subject: item.subject,
      created_at: item.date,
      status: item.status,
    });
    try {
      const res = await fetch(`/api/resend/emails/${item.id}`);
      const data = await res.json();
      if (res.ok && data.email) {
        setDetailData((prev) => ({ ...prev, ...data.email }));
        if (data.email.status || data.email.last_event) {
          const newStatus = data.email.last_event ?? data.email.status;
          setItems((current) => current.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)));
        }
      }
    } catch (err) {
      console.warn("Remote email HTML fetch failed:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFilterChange = (value: string) => {
    setAnimatingFilter(true);
    setStatusFilter(value);
    setTimeout(() => setAnimatingFilter(false), 200);
  };

  const siteItems = useMemo(
    () =>
      items.filter((item) => {
        const itemSite = normalizeSite((item as any).siteId);
        const targetSite = normalizeSite(siteFilter);
        return siteFilter === "all" || itemSite === targetSite;
      }),
    [items, siteFilter]
  );

  const rows = useMemo(
    () =>
      siteItems.filter((item) => {
        const date = item.date?.slice(0, 10) ?? "";
        const state = normalizeStatus(item.status);
        return (
          (!fromDate || date >= fromDate) &&
          (!toDate || date <= toDate) &&
          (statusFilter === "all" || state === statusFilter) &&
          (!query || `${item.to} ${item.subject} ${item.from} ${item.id}`.toLowerCase().includes(query.toLowerCase()))
        );
      }),
    [siteItems, fromDate, toDate, statusFilter, query]
  );

  const delivered = siteItems.filter((item) => ["delivered", "opened", "clicked"].includes(normalizeStatus(item.status))).length;
  const attention = siteItems.filter((item) => ["bounced", "failed", "complained"].includes(normalizeStatus(item.status))).length;
  const recipients = new Set(siteItems.map((item) => item.to.toLowerCase())).size;
  const hasFilters = Boolean(query || fromDate || toDate || statusFilter !== "all");
  const clearFilters = () => {
    setQuery("");
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
  };

  if (loading)
    return (
      <div className="activity-workspace" aria-label="Cargando actividad">
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes skeletonPulse {
            0% { opacity: 0.6; }
            50% { opacity: 0.3; }
            100% { opacity: 0.6; }
          }
          .skeleton-pulse {
            animation: skeletonPulse 1.4s ease-in-out infinite;
          }
        `,
          }}
        />
        {/* Skeleton Overview Metrics */}
        <section className="activity-overview">
          {[1, 2, 3, 4].map((index) => (
            <article key={index} style={{ opacity: 0.75 }}>
              <div
                className="skeleton-pulse"
                style={{ width: 36, height: 36, borderRadius: 8, background: "var(--ui-border, #e2e8f0)" }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <div
                  className="skeleton-pulse"
                  style={{ width: 44, height: 18, borderRadius: 4, background: "var(--ui-border, #e2e8f0)" }}
                />
                <div
                  className="skeleton-pulse"
                  style={{ width: 110, height: 12, borderRadius: 4, background: "var(--ui-border, #e2e8f0)" }}
                />
              </div>
            </article>
          ))}
        </section>

        {/* Skeleton Table Panel */}
        <section className="card activity-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div
                className="skeleton-pulse"
                style={{ width: 170, height: 22, borderRadius: 6, background: "var(--ui-border, #e2e8f0)", marginBottom: 8 }}
              />
              <div
                className="skeleton-pulse"
                style={{ width: 280, height: 12, borderRadius: 4, background: "var(--ui-border, #e2e8f0)" }}
              />
            </div>
            <div
              className="skeleton-pulse"
              style={{ width: 90, height: 32, borderRadius: 8, background: "var(--ui-border, #e2e8f0)" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div
                key={row}
                style={{
                  display: "grid",
                  gridTemplateColumns: "130px 1fr 1fr 90px",
                  gap: 16,
                  padding: "14px 16px",
                  borderRadius: 8,
                  background: "var(--surface-subtle, #f8fafc)",
                  alignItems: "center",
                }}
              >
                <div className="skeleton-pulse" style={{ width: 100, height: 12, borderRadius: 4, background: "var(--ui-border, #e2e8f0)" }} />
                <div className="skeleton-pulse" style={{ width: 160, height: 12, borderRadius: 4, background: "var(--ui-border, #e2e8f0)" }} />
                <div className="skeleton-pulse" style={{ width: 220, height: 12, borderRadius: 4, background: "var(--ui-border, #e2e8f0)" }} />
                <div className="skeleton-pulse" style={{ width: 65, height: 20, borderRadius: 10, background: "var(--ui-border, #e2e8f0)", justifySelf: "end" }} />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  if (loadError)
    return (
      <div className="card activity-error">
        <span>
          <AlertCircle size={20} />
        </span>
        <div>
          <strong>No pudimos cargar la actividad</strong>
          <p>{loadError}</p>
        </div>
        <button className="btn" onClick={() => void load()}>
          <RefreshCw size={13} />
          Reintentar
        </button>
      </div>
    );

  const currentStatusState = selectedItem ? normalizeStatus(detailData?.status ?? selectedItem.status) : "sent";
  const isDeliveredState = ["delivered", "opened", "clicked"].includes(currentStatusState);
  const isBouncedState = ["bounced", "failed", "complained", "suppressed", "blocked"].includes(currentStatusState);

  return (
    <div className="activity-workspace">
      <section className="activity-overview" aria-label="Resumen de actividad">
        <article>
          <span className="activity-overview-icon">
            <Send size={16} />
          </span>
          <div>
            <strong>{siteItems.length}</strong>
            <small>correos registrados</small>
          </div>
        </article>
        <article>
          <span className="activity-overview-icon positive">
            <CheckCircle2 size={16} />
          </span>
          <div>
            <strong>{delivered}</strong>
            <small>entregados</small>
          </div>
        </article>
        <article>
          <span className={`activity-overview-icon ${attention ? "attention" : ""}`}>
            <AlertCircle size={16} />
          </span>
          <div>
            <strong>{attention}</strong>
            <small>requieren atención</small>
          </div>
        </article>
        <article>
          <span className="activity-overview-icon">
            <UsersRound size={16} />
          </span>
          <div>
            <strong>{recipients}</strong>
            <small>destinatarios únicos</small>
          </div>
        </article>
      </section>

      <section className="card activity-panel">
        <header>
          <div>
            <h2>Historial de envíos</h2>
            <p>Haz clic en cualquier correo para ver el detalle y eventos de entrega.</p>
          </div>
          <button className="btn" onClick={() => void load()}>
            <RefreshCw size={13} />
            Actualizar
          </button>
        </header>
        <div className="activity-toolbar">
          <label className="activity-search">
            <Search size={14} />
            <input
              className="search-input"
              aria-label="Buscar en actividad"
              placeholder="Buscar destinatario o asunto"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery("")}>
                <X size={12} />
              </button>
            )}
          </label>
          <div className="activity-status-filters" aria-label="Filtrar por estado">
            {[
              ["all", "Todos"],
              ["sent", "Enviados"],
              ["delivered", "Entregados"],
              ["bounced", "Rebotados"],
              ["failed", "Fallidos"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={statusFilter === value ? "active" : ""}
                aria-pressed={statusFilter === value}
                onClick={() => handleFilterChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <details className="activity-date-filter">
            <summary>
              <CalendarDays size={13} />
              Fechas{(fromDate || toDate) && <i />}
            </summary>
            <div>
              <label>
                Desde
                <input aria-label="Desde" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
              </label>
              <label>
                Hasta
                <input aria-label="Hasta" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
              </label>
            </div>
          </details>
          {hasFilters && (
            <button className="activity-clear" type="button" onClick={clearFilters}>
              Limpiar
            </button>
          )}
        </div>
        <div className="activity-result-line">
          <span>
            {rows.length} {rows.length === 1 ? "resultado" : "resultados"}
          </span>
          {hasFilters && <small>Filtros aplicados</small>}
        </div>
        {rows.length ? (
          <div className="activity-table-wrap" style={{ opacity: animatingFilter ? 0.4 : 1 }}>
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Destinatario</th>
                  <th>Comunicación</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const state = normalizeStatus(item.status);
                  const meta = statusMeta[state] ?? { label: "Enviado", tone: "sent" };
                  return (
                    <tr
                      key={item.id}
                      onClick={() => void openDetail(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          void openDetail(item);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Ver detalle del correo enviado a ${item.to}: ${item.subject || "Sin asunto"}`}
                      style={{ cursor: "pointer" }}
                      title="Haz clic para ver el detalle del envío"
                    >
                      <td>
                        <span className="activity-date">
                          <Clock3 size={12} />
                          {formatDate(item.date)}
                        </span>
                      </td>
                      <td>
                        <span className="activity-recipient">
                          <i>{item.to.slice(0, 1).toUpperCase()}</i>
                          <strong title={item.to}>{item.to}</strong>
                        </span>
                      </td>
                      <td>
                        <span className="activity-message">
                          <strong title={item.subject || "Sin asunto"}>{item.subject || "Sin asunto"}</strong>
                          <small>
                            <Mail size={10} />
                            {item.from}
                          </small>
                        </span>
                      </td>
                      <td>
                        <span
                          className={`activity-status-icon ${meta.tone}`}
                          title={`Estado: ${meta.label}`}
                          aria-label={`Estado: ${meta.label}`}
                        >
                          <Send size={14} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="activity-empty">
            <span>
              <Search size={19} />
            </span>
            <strong>No encontramos actividad</strong>
            <p>
              {items.length
                ? "Prueba con otros filtros o una búsqueda más amplia."
                : "Los envíos aparecerán aquí cuando realices la primera prueba."}
            </p>
            {hasFilters && (
              <button className="btn" type="button" onClick={clearFilters}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </section>

      {/* Modal de Detalle del Envío */}
      {selectedItem && (
        <div
          className="dialog-backdrop"
          onClick={() => setSelectedItem(null)}
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
            ref={modalRef}
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "760px",
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
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#e0e7ff",
                    color: "#4338ca",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Mail size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--am-ink, #0f172a)" }}>
                    Detalle del Envío
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>ID: {selectedItem.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="btn subtle"
                style={{ padding: "6px", borderRadius: "8px" }}
                aria-label="Cerrar modal"
              >
                <X size={16} />
              </button>
            </header>

            {/* Modal Body with Single Scrollbar */}
            <div style={{ padding: "20px", overflowY: "auto", display: "grid", gap: "16px" }}>
              {/* Info Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "12px",
                  background: "var(--am-surface-2, #f8fafc)",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "1px solid var(--am-border, #e2e8f0)",
                }}
              >
                <div>
                  <small style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 600, display: "block" }}>DESTINATARIO(S)</small>
                  <strong style={{ fontSize: "13px", color: "var(--am-ink, #0f172a)", wordBreak: "break-all" }}>{selectedItem.to}</strong>
                </div>
                <div>
                  <small style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 600, display: "block" }}>REMITENTE</small>
                  <span style={{ fontSize: "13px", color: "var(--am-ink, #334155)" }}>{selectedItem.from}</span>
                </div>
                <div>
                  <small style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 600, display: "block" }}>FECHA DE ENVÍO</small>
                  <span style={{ fontSize: "13px", color: "var(--am-ink, #334155)" }}>{formatDate(selectedItem.date)}</span>
                </div>
              </div>

              {/* EVENTOS DEL ENVÍO TIMELINE */}
              <div>
                <small style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  EVENTOS DEL ENVÍO
                </small>
                <div
                  style={{
                    background: "var(--am-surface-2, #f8fafc)",
                    borderRadius: "12px",
                    padding: "16px 24px",
                    border: "1px solid var(--am-border, #e2e8f0)",
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                  }}
                >
                  {/* Sent Node */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: "var(--am-surface, #ffffff)",
                        border: "1px solid var(--am-border, #cbd5e1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--am-ink, #0f172a)",
                      }}
                    >
                      <Send size={16} />
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--am-ink, #0f172a)" }}>Enviado</span>
                    <span style={{ fontSize: "10px", color: "var(--muted, #64748b)" }}>{formatDate(selectedItem.date)}</span>
                  </div>

                  {/* Connector Line */}
                  <div
                    style={{
                      flex: 1,
                      height: "2px",
                      background: isBouncedState ? "#ef4444" : isDeliveredState ? "#10b981" : "#cbd5e1",
                      alignSelf: "center",
                      marginBottom: "20px",
                    }}
                  />

                  {/* Status Node */}
                  {isBouncedState ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          background: "#fef2f2",
                          border: "1px solid #ef4444",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ef4444",
                        }}
                      >
                        <AlertCircle size={16} />
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#ef4444",
                          background: "#fee2e2",
                          padding: "2px 8px",
                          borderRadius: "12px",
                        }}
                      >
                        {currentStatusState === "suppressed" || currentStatusState === "blocked" ? "Bloqueado" : "Rebotado"}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--muted, #64748b)" }}>{formatDate(selectedItem.date)}</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          background: isDeliveredState ? "#ecfdf5" : "var(--am-surface, #ffffff)",
                          border: isDeliveredState ? "1px solid #10b981" : "1px solid var(--am-border, #cbd5e1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isDeliveredState ? "#10b981" : "var(--am-ink, #0f172a)",
                        }}
                      >
                        <CheckCircle2 size={16} />
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: isDeliveredState ? "#10b981" : "var(--am-ink, #0f172a)",
                          background: isDeliveredState ? "#d1fae5" : "var(--am-surface, #ffffff)",
                          padding: "2px 8px",
                          borderRadius: "12px",
                        }}
                      >
                        {isDeliveredState ? "Entregado" : "Enviado"}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--muted, #64748b)" }}>{formatDate(selectedItem.date)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div>
                <small style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                  ASUNTO DEL CORREO
                </small>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--am-ink, #0f172a)" }}>{selectedItem.subject || "Sin asunto"}</div>
              </div>

              {/* HTML Content Preview & Skeleton UI Loader */}
              <div>
                <small style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 600, display: "block", marginBottom: "8px" }}>
                  CORREO HTML ENVIADO
                </small>
                {detailLoading ? (
                  <div style={{ display: "grid", gap: "10px", padding: "16px", background: "var(--am-surface-2, #f8fafc)", borderRadius: "10px", border: "1px solid var(--am-border, #e2e8f0)" }}>
                    <div className="skeleton-pulse" style={{ height: "20px", width: "45%", borderRadius: "6px", background: "var(--am-border, #cbd5e1)" }} />
                    <div className="skeleton-pulse" style={{ height: "14px", width: "75%", borderRadius: "4px", background: "var(--am-border, #e2e8f0)" }} />
                    <div className="skeleton-pulse" style={{ height: "220px", width: "100%", borderRadius: "8px", background: "var(--am-border, #e2e8f0)", marginTop: "6px" }} />
                  </div>
                ) : detailData?.html ? (
                  <iframe
                    title="Vista previa del correo"
                    srcDoc={detailData.html}
                    style={{
                      width: "100%",
                      height: "380px",
                      border: "1px solid var(--am-border, #cbd5e1)",
                      borderRadius: "8px",
                      background: "#ffffff",
                      overflow: "hidden",
                    }}
                  />
                ) : (
                  <div style={{ padding: "20px", textAlign: "center", background: "var(--am-surface-2, #f8fafc)", borderRadius: "8px", border: "1px dashed var(--am-border, #cbd5e1)" }}>
                    <Mail size={24} style={{ color: "var(--muted, #94a3b8)", marginBottom: "6px" }} />
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--muted, #64748b)" }}>
                      Correo registrado y entregado a <strong>{selectedItem.to}</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
