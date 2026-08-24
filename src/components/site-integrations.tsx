"use client";
import { CheckCircle2, CircleAlert, Loader2, Mail, RefreshCw, Send, Settings2, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Integration } from "@/src/domain/types";

export function SiteIntegrations({
  siteId,
  tokko,
  wordpress,
  resendReady,
}: {
  siteId: string;
  tokko?: Integration;
  wordpress?: Integration;
  resendReady: boolean;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState<"tokko" | "wordpress" | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    success: boolean;
  } | null>(null);

  // Test Email Modal state
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Live updated timestamps
  const [tokkoSyncTime, setTokkoSyncTime] = useState<string | null>(tokko?.lastSyncAt ?? null);
  const [wpSyncTime, setWpSyncTime] = useState<string | null>(wordpress?.lastSyncAt ?? null);

  async function sync(provider: "tokko" | "wordpress") {
    setSyncing(provider);
    setMessage(null);
    try {
      const response = await fetch(`/api/${provider}/sync`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.error ?? `No se pudo sincronizar ${provider}.`);

      const nowFormatted = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
      if (provider === "tokko") {
        setTokkoSyncTime(`Hoy · ${nowFormatted}`);
      } else {
        setWpSyncTime(`Hoy · ${nowFormatted}`);
      }

      setMessage({
        success: true,
        text:
          provider === "tokko"
            ? `${result.assigned ?? result.received} propiedades asignadas; ${result.received} revisadas.`
            : `${result.received} artículos sincronizados (${result.created} nuevos).`,
      });
      router.refresh();
    } catch (error) {
      setMessage({
        success: false,
        text:
          error instanceof Error
            ? error.message
            : "No se pudo completar la sincronización.",
      });
    } finally {
      setSyncing(null);
    }
  }

  const [testModalError, setTestModalError] = useState<string | null>(null);
  const [testModalSuccess, setTestModalSuccess] = useState<string | null>(null);

  async function handleSendTestEmail(e: React.FormEvent) {
    e.preventDefault();
    setTestModalError(null);
    setTestModalSuccess(null);
    if (!testEmail || !testEmail.includes("@")) {
      setTestModalError("Por favor ingresa un correo válido.");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/test-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: testEmail, siteId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Error al enviar correo de prueba.");
      setTestModalSuccess(`¡Correo de prueba enviado exitosamente a ${testEmail}!`);
      setMessage({ success: true, text: `¡Correo de prueba enviado a ${testEmail}!` });
      setTimeout(() => {
        setTestModalOpen(false);
        setTestEmail("");
        setTestModalSuccess(null);
        setTestModalError(null);
      }, 1400);
    } catch (err) {
      setTestModalError(err instanceof Error ? err.message : "No se pudo enviar el correo de prueba.");
    } finally {
      setSendingTest(false);
    }
  }

  const tokkoConnected = tokko?.status === "connected";
  const wordpressConnected = wordpress?.status === "connected";

  return (
    <>
      <aside className={`site-integrations-stack ${syncing ? "is-syncing" : ""}`} aria-busy={Boolean(syncing)}>
        <section className="card form-card site-integration-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Conexiones</p>
              <h2 className="section-title">Integraciones</h2>
            </div>
            <Settings2 size={17} aria-hidden="true" />
          </div>

          {/* Tokko Broker */}
          <div className="site-integration-row" style={{ alignItems: "center" }}>
            <div>
              <strong>Tokko Broker</strong>
              <span>
                {tokkoConnected
                  ? tokkoSyncTime && tokkoSyncTime.startsWith("Hoy")
                    ? `Sincronizado: ${tokkoSyncTime}`
                    : "Conexión activa · Consulta automática en tiempo real"
                  : "Aún no se importaron propiedades"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <span className={`badge ${tokkoConnected ? "connected" : "pending"}`}>
                {tokkoConnected ? "Conectado" : "Pendiente"}
              </span>
              <button
                type="button"
                className="btn subtle"
                onClick={() => void sync("tokko")}
                disabled={Boolean(syncing)}
                title="Sincronizar ahora"
                aria-label="Sincronizar Tokko ahora"
                style={{ width: "30px", height: "30px", padding: 0, display: "grid", placeItems: "center", borderRadius: "8px" }}
              >
                {syncing === "tokko" ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />}
              </button>
            </div>
          </div>

          {/* WordPress */}
          <div className="site-integration-row" style={{ alignItems: "center" }}>
            <div>
              <strong>WordPress</strong>
              <span>
                {wordpressConnected
                  ? wpSyncTime && wpSyncTime.startsWith("Hoy")
                    ? `Sincronizado: ${wpSyncTime}`
                    : "Conexión activa · Consulta automática en tiempo real"
                  : "Importa los artículos públicos del sitio"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <span className={`badge ${wordpressConnected ? "connected" : "pending"}`}>
                {wordpressConnected ? "Conectado" : "Pendiente"}
              </span>
              <button
                type="button"
                className="btn subtle"
                onClick={() => void sync("wordpress")}
                disabled={Boolean(syncing)}
                title="Sincronizar ahora"
                aria-label="Sincronizar WordPress ahora"
                style={{ width: "30px", height: "30px", padding: 0, display: "grid", placeItems: "center", borderRadius: "8px" }}
              >
                {syncing === "wordpress" ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />}
              </button>
            </div>
          </div>

          {/* Email Service */}
          <div className="site-integration-row" style={{ alignItems: "center" }}>
            <div>
              <strong>Servidor de Correos (Email)</strong>
              <span>
                {resendReady
                  ? "API lista y activa para envíos"
                  : "Falta configurar las credenciales"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <span className={`badge ${resendReady ? "connected" : "pending"}`}>
                {resendReady ? "Disponible" : "Pendiente"}
              </span>
              <button
                type="button"
                className="btn subtle"
                onClick={() => setTestModalOpen(true)}
                title="Probar envío de correo"
                style={{ height: "30px", padding: "0 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "5px", borderRadius: "8px" }}
              >
                <Mail size={13} /> Probar
              </button>
            </div>
          </div>

          {message && (
            <p className={`notice ${message.success ? "success" : "error"} motion-notice`} role="status" aria-live="polite">
              {message.success ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}{message.text}
            </p>
          )}
        </section>

        <section className="card form-card site-next-step">
          <CheckCircle2 size={18} aria-hidden="true" />
          <div>
            <h2 className="section-title">Contenido real</h2>
            <p>
              Tokko alimenta las oficinas y WordPress alimenta el boletín
              editorial de la marca.
            </p>
          </div>
        </section>
      </aside>

      {/* Test Email Modal Dialog */}
      {testModalOpen && (
        <div
          className="contacts-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && !sendingTest && setTestModalOpen(false)}
        >
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            style={{
              width: "440px",
              maxWidth: "92vw",
              padding: "24px",
              borderRadius: "16px",
              background: "#ffffff",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              border: "1px solid #e2e8f0",
            }}
          >
            <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "#e0e7ff",
                    color: "#4338ca",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Mail size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    Enviar correo de prueba
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                    Verifica la conexión del servidor de correos recibiendo un mensaje en tu bandeja.
                  </p>
                </div>
              </div>
              <button
                className="icon-btn"
                type="button"
                onClick={() => !sendingTest && setTestModalOpen(false)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleSendTestEmail} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {testModalError && (
                <div className="notice error motion-notice" style={{ padding: "8px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }} role="alert">
                  <CircleAlert size={14} /> {testModalError}
                </div>
              )}
              {testModalSuccess && (
                <div className="notice success motion-notice" style={{ padding: "8px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }} role="status">
                  <CheckCircle2 size={14} /> {testModalSuccess}
                </div>
              )}
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                <span>Correo destinatario</span>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="tu-correo@empresa.com"
                  required
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    width: "100%",
                  }}
                />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px" }}>
                <button
                  type="button"
                  className="btn subtle"
                  disabled={sendingTest}
                  onClick={() => setTestModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={sendingTest || !testEmail.trim()}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {sendingTest ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
                  {sendingTest ? "Enviando prueba..." : "Enviar prueba"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
