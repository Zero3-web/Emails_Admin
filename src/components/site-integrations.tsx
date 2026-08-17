"use client";
import { CheckCircle2, CircleAlert, Loader2, RefreshCw, Settings2 } from "lucide-react";
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
  const tokkoConnected = tokko?.status === "connected";
  const wordpressConnected = wordpress?.status === "connected";
  return (
    <aside className={`site-integrations-stack ${syncing ? "is-syncing" : ""}`} aria-busy={Boolean(syncing)}>
      <section className="card form-card site-integration-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Conexiones</p>
            <h2 className="section-title">Integraciones</h2>
          </div>
          <Settings2 size={17} aria-hidden="true" />
        </div>
        <div className="site-integration-row">
          <div>
            <strong>Tokko Broker</strong>
            <span>
              {tokkoConnected
                ? tokko?.lastSyncAt
                  ? `Última sincronización: ${tokko.lastSyncAt}`
                  : "Sincronizado"
                : "Aún no se importaron propiedades"}
            </span>
          </div>
          <span className={`badge ${tokkoConnected ? "connected" : "pending"}`}>
            {tokkoConnected ? "Conectado" : "Pendiente"}
          </span>
        </div>
        <button
          className="btn primary site-sync-button"
          type="button"
          onClick={() => void sync("tokko")}
          disabled={Boolean(syncing)}
        >
          {syncing === "tokko" ? (
            <Loader2 className="spin" size={15} />
          ) : (
            <RefreshCw size={15} />
          )}
          {syncing === "tokko"
            ? "Sincronizando propiedades…"
            : tokkoConnected
              ? "Actualizar propiedades"
              : "Sincronizar propiedades"}
        </button>
        <div className="site-integration-row">
          <div>
            <strong>WordPress</strong>
            <span>
              {wordpressConnected
                ? wordpress?.lastSyncAt
                  ? `Última sincronización: ${wordpress.lastSyncAt}`
                  : "Artículos sincronizados"
                : "Importa los artículos públicos del sitio"}
            </span>
          </div>
          <span
            className={`badge ${wordpressConnected ? "connected" : "pending"}`}
          >
            {wordpressConnected ? "Conectado" : "Pendiente"}
          </span>
        </div>
        <button
          className="btn site-integration-link"
          type="button"
          onClick={() => void sync("wordpress")}
          disabled={Boolean(syncing)}
        >
          {syncing === "wordpress" ? (
            <Loader2 className="spin" size={15} />
          ) : (
            <RefreshCw size={15} />
          )}
          {syncing === "wordpress"
            ? "Sincronizando artículos…"
            : wordpressConnected
              ? "Actualizar artículos"
              : "Sincronizar artículos"}
        </button>
        <div className="site-integration-row">
          <div>
            <strong>Resend</strong>
            <span>
              {resendReady
                ? "API disponible para los envíos de este sitio"
                : "Falta configurar la API"}
            </span>
          </div>
          <span className={`badge ${resendReady ? "connected" : "pending"}`}>
            {resendReady ? "Disponible" : "Pendiente"}
          </span>
        </div>
        <a className="btn site-integration-link" href="/integrations">
          Probar envío con Resend
        </a>
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
  );
}
