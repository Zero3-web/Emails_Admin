"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Clock3, Mail, MailCheck, RefreshCw, Trash2 } from "lucide-react";

export type SentEmailRecord = {
  id: string;
  to: string;
  subject: string;
  from: string;
  createdAt: string;
  lastEvent?: string;
  error?: string;
};

const STORAGE_KEY = "area_mail_resend_sent_emails";

export function ResendEmailTracker({
  newRecord,
}: {
  newRecord?: SentEmailRecord | null;
}) {
  const [records, setRecords] = useState<SentEmailRecord[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Save records to localStorage whenever records update
  const saveRecords = (updated: SentEmailRecord[]) => {
    setRecords(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  async function refreshEmailStatus(id: string) {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/resend/emails/${id}`);
      const data = await res.json();
      if (res.ok && data.email) {
        setRecords((prev) => { const updated = prev.map((r) => r.id === id ? { ...r, lastEvent: data.email.last_event || data.email.status || "sent", from: data.email.from || r.from, to: Array.isArray(data.email.to) ? data.email.to.join(", ") : r.to, error: undefined } : r); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* Storage is optional. */ } return updated; });
      } else setRecords((prev) => prev.map((r) => r.id === id ? { ...r, error: data.error || "No se pudo obtener el estado" } : r));
    } catch (err: unknown) { const msg = err instanceof Error ? err.message : "Error al conectar con la API"; setRecords((prev) => prev.map((r) => r.id === id ? { ...r, error: msg } : r)); }
    finally { setLoadingId(null); }
  }

  useEffect(() => {
    if (!newRecord?.id) return;
    const addTimer = window.setTimeout(() => {
      setRecords((prev) => {
        if (prev.some((r) => r.id === newRecord.id)) return prev;
        const updated = [newRecord, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });
    }, 0);
    const refreshTimer = window.setTimeout(() => refreshEmailStatus(newRecord.id), 2000);
    return () => { window.clearTimeout(addTimer); window.clearTimeout(refreshTimer); };
  }, [newRecord]);

  const refreshAll = async () => {
    for (const record of records) {
      await refreshEmailStatus(record.id);
    }
  };

  const removeRecord = (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    saveRecords(updated);
  };

  const clearAll = () => {
    saveRecords([]);
  };

  return (
    <div className="card form-card" style={{ marginTop: 24 }}>
      <div
        className="section-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <strong className="tracker-title"><MailCheck size={18} /> Estado de correos enviados</strong>
          <p className="subtitle" style={{ marginTop: 4 }}>
            Monitoreo en tiempo real del estado de entrega en la red de Resend (Sent, Delivered, Bounced, etc.).
          </p>
        </div>
        {records.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={refreshAll}
              style={{ fontSize: 12, padding: "6px 12px" }}
            >
              <RefreshCw size={13} />Actualizar todos
            </button>
            <button
              type="button"
              className="btn"
              onClick={clearAll}
              style={{ fontSize: 12, padding: "6px 12px", color: "#94a3b8" }}
            >
              <Trash2 size={13} /> Limpiar
            </button>
          </div>
        )}
      </div>

      {records.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            background: "#f8fafc",
            borderRadius: 8,
            border: "1px dashed #cbd5e1",
            color: "#64748b",
            fontSize: 14,
          }}
        >
          <Mail size={22} style={{ display: "block", margin: "0 auto 6px" }} aria-hidden="true" />
          <strong>No hay correos registrados en esta sesión.</strong>
          <p style={{ margin: "4px 0 0 0", fontSize: 12 }}>
            Envía un correo de prueba usando el formulario de arriba y aparecerá automáticamente aquí abajo con su estado de entrega en vivo de Resend.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {records.map((rec) => {

          const isDelivered = rec.lastEvent === "delivered";
          const isBounced = rec.lastEvent === "bounced";
          const isComplained = rec.lastEvent === "complained";
          const isLoading = loadingId === rec.id;

          return (
            <div
              key={rec.id}
              style={{
                background: "#0f172a",
                color: "#f8fafc",
                padding: 18,
                borderRadius: 12,
                border: "1px solid #1e293b",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            >
              {/* Header section with metadata */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                  borderBottom: "1px solid #1e293b",
                  paddingBottom: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#ffffff" }}>
                    {rec.subject}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                    <span>Para: <strong>{rec.to}</strong></span> • <span>De: {rec.from}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      background: "#1e293b",
                      padding: "3px 8px",
                      borderRadius: 4,
                      color: "#cbd5e1",
                    }}
                  >
                    ID: {rec.id}
                  </span>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    {rec.createdAt}
                  </div>
                </div>
              </div>

              {/* EMAIL EVENTS timeline card (replica of Resend dashboard UI) */}
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#64748b",
                    fontWeight: 600,
                    marginBottom: 10,
                  }}
                >
                  EMAIL EVENTS
                </div>

                <div
                  style={{
                    background: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    position: "relative",
                  }}
                >
                  {/* Step 1: Sent */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "#1e293b",
                        border: "1px solid #334155",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                      }}
                    >
                      ➢
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: "#1e293b",
                        color: "#94a3b8",
                        fontWeight: 600,
                      }}
                    >
                      Sent
                    </span>
                  </div>

                  {/* Connecting Line */}
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: isDelivered ? "#10b981" : isBounced ? "#ef4444" : "#334155",
                      transition: "background 0.3s ease",
                    }}
                  />

                  {/* Step 2: Delivered / Bounced Status */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: isDelivered
                          ? "#064e3b"
                          : isBounced
                          ? "#7f1d1d"
                          : isComplained
                          ? "#78350f"
                          : "#1e293b",
                        border: `1px solid ${
                          isDelivered
                            ? "#10b981"
                            : isBounced
                            ? "#ef4444"
                            : isComplained
                            ? "#f59e0b"
                            : "#334155"
                        }`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        color: isDelivered
                          ? "#34d399"
                          : isBounced
                          ? "#fca5a5"
                          : "#fcd34d",
                      }}
                    >
                      {isDelivered ? <CircleCheck size={14} /> : isBounced || isComplained ? <CircleAlert size={14} /> : <Clock3 size={14} />}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontWeight: 600,
                        background: isDelivered
                          ? "#064e3b"
                          : isBounced
                          ? "#7f1d1d"
                          : isComplained
                          ? "#78350f"
                          : "#1e293b",
                        color: isDelivered
                          ? "#34d399"
                          : isBounced
                          ? "#fca5a5"
                          : isComplained
                          ? "#fcd34d"
                          : "#94a3b8",
                      }}
                    >
                      {isDelivered
                        ? "Delivered (Entregado)"
                        : isBounced
                        ? "Bounced (Rebotado)"
                        : isComplained
                        ? "Complained (Spam)"
                        : rec.lastEvent
                        ? rec.lastEvent
                        : "Procesando..."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: "1px solid #1e293b",
                }}
              >
                {rec.error ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#f87171" }}><CircleAlert size={13} /> {rec.error}</span>
                ) : (
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    {isDelivered
                      ? "El correo fue entregado exitosamente en el buzón del destinatario."
                      : isBounced
                      ? "El servidor de destino rechazó o no encontró la casilla del usuario."
                      : "Verificando eventos con la API de Resend..."}
                  </span>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => refreshEmailStatus(rec.id)}
                    disabled={isLoading}
                    style={{
                      background: "#1e293b",
                      border: "1px solid #334155",
                      color: "#f8fafc",
                      padding: "5px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: isLoading ? "wait" : "pointer",
                    }}
                  >
                    <RefreshCw size={13} className={isLoading ? "spin" : ""} />{isLoading ? "Verificando…" : "Verificar estado"}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeRecord(rec.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#64748b",
                      padding: "5px 8px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                    title="Eliminar de la vista"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
