import { AlertCircle, ArrowRight, Building2, CheckCircle2, Clock3, Database, Mail, Newspaper, PlugZap } from "lucide-react";
import Link from "next/link";
import { PageHeader, SiteMark } from "@/src/components/ui";
import { ResendTestForm } from "@/src/components/resend-test-form";
import { TokkoConnectionCard } from "@/src/components/tokko-connection-card";
import { getIntegrations, getSites } from "@/src/database/repositories";
import { isSupabaseConfigured } from "@/src/database/supabase/server";
import { requirePanelAccess } from "@/src/auth/server";
import { redirect } from "next/navigation";

const providerMeta = {
  tokko: { label: "Tokko Broker", description: "Mantiene actualizado el inventario de propiedades.", icon: Building2 },
  wordpress: { label: "WordPress", description: "Importa los artículos publicados de la marca.", icon: Newspaper },
  resend: { label: "Resend", description: "Entrega los correos y registra su estado.", icon: Mail },
};

const statusCopy = { connected: "Conectado", pending: "Pendiente", error: "Requiere atención", disabled: "Desactivado" };
const formatSync = (value: string | null) => {
  if (!value) return "Sin actividad todavía";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Actividad registrada";
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" }).format(date);
};

export default async function Integrations() {
  if (!(await requirePanelAccess()).platformOwner) redirect("/no-access");
  const [integrations, sites] = await Promise.all([getIntegrations(), getSites()]);
  const resendReady = Boolean(process.env.RESEND_API_KEY);
  const resendTrackingReady = Boolean(process.env.RESEND_WEBHOOK_SECRET);
  const supabaseReady = isSupabaseConfigured();
  const connected = integrations.filter((item) => item.status === "connected").length;
  const attention = integrations.filter((item) => item.status === "error" || item.status === "pending").length + (resendReady && resendTrackingReady ? 0 : 1);
  const latestSync = integrations.map((item) => item.lastSyncAt).filter(Boolean).sort().at(-1) ?? null;
  return <><PageHeader eyebrow="Configuración" title="Integraciones" description="Controla las fuentes de contenido y el servicio de envío desde un solo lugar." />
    <section className={`system-priority ${attention ? "attention" : "ready"}`}>
      <span>{attention ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}</span>
      <div><small>Estado general</small><strong>{attention ? `${attention} ${attention === 1 ? "configuración necesita" : "configuraciones necesitan"} revisión` : "Configuración técnica completa"}</strong><p>{attention ? "Revisa los elementos marcados antes de programar el próximo envío." : "Las fuentes, el envío y el seguimiento están configurados."}</p></div>
      <Link className="btn" href="/settings">Ver estado del sistema <ArrowRight size={13} /></Link>
    </section>
    <section className="integration-summary-grid" aria-label="Resumen de integraciones">
      <article><span><PlugZap size={16} /></span><div><strong>{connected}/{integrations.length}</strong><small>conexiones registradas</small></div></article>
      <article><span><AlertCircle size={16} /></span><div><strong>{attention}</strong><small>requieren atención</small></div></article>
      <article><span><Clock3 size={16} /></span><div><strong>{latestSync ? formatSync(latestSync) : "Sin datos"}</strong><small>última actualización</small></div></article>
    </section>
    {sites.length ? <div className="integration-sites">{sites.map((site) => {
      const siteIntegrations = integrations.filter((item) => item.siteId === site.id);
      return <section className="card integration-site-card" key={site.id}>
        <header><div className="integration-site-title"><SiteMark site={site} small /><div><h2>{site.name}</h2><p>{site.domain}</p></div></div><Link href={`/sites/${site.id}`}>Administrar marca <ArrowRight size={12} /></Link></header>
        <div className="integration-list">{siteIntegrations.map((integration) => { const meta = providerMeta[integration.provider]; const Icon = meta.icon; return <article className={integration.status} key={integration.id}>
          <span className="integration-provider-icon"><Icon size={17} /></span><div><strong>{meta.label}</strong><p>{meta.description}</p></div><div className="integration-sync"><span>{formatSync(integration.lastSyncAt)}</span>{integration.lastError && <small>{integration.lastError}</small>}</div><span className={`badge ${integration.status}`}>{statusCopy[integration.status]}</span>
        </article>; })}</div>
      </section>;
    })}</div> : <div className={`card integration-notice ${supabaseReady ? "ready" : ""}`}><span className="onboarding-icon">{supabaseReady ? <CheckCircle2 size={17} /> : <Database size={17} />}</span><div><strong>{supabaseReady ? "Crea tu primera marca" : "Almacenamiento pendiente"}</strong><p>{supabaseReady ? "Registra una marca para conectar sus fuentes de contenido." : "Completa la configuración principal para comenzar."}</p></div><Link className="section-link" href={supabaseReady ? "/sites" : "/settings"}>{supabaseReady ? "Crear marca" : "Revisar estado"}<ArrowRight size={13} /></Link></div>}
    <details className="integration-tools refined">
      <summary><span><strong>Pruebas y diagnóstico</strong><small>Comprueba manualmente Tokko o envía un correo de prueba.</small></span><ArrowRight size={14} /></summary>
      <div>
        <TokkoConnectionCard />
        {resendReady && <ResendTestForm />}
      </div>
    </details>
  </>;
}
