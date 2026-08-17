import Link from "next/link";
import { AlertCircle, ArrowRight, Check, CheckCircle2, Database, LockKeyhole, Mail, Radio, ShieldCheck, Workflow } from "lucide-react";

type Check = { label: string; detail: string; ready: boolean; icon: "database" | "mail" | "source" | "runtime" };
const icons = { database: Database, mail: Mail, source: Radio, runtime: Workflow };

export function SettingsView({ checks, bulkSendingEnabled }: { checks: Check[]; bulkSendingEnabled: boolean }) {
  const ready = checks.filter((check) => check.ready).length;
  const pending = checks.length - ready;
  const next = checks.find((check) => !check.ready);

  return <div className="settings-console refined">
    <section className={`system-priority ${pending ? "attention" : "ready"}`}>
      <span>{pending ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}</span>
      <div><small>Preparación general</small><strong>{pending ? `${ready} de ${checks.length} componentes están listos` : "El sistema está listo para operar"}</strong><p>{next ? `Siguiente prioridad: ${next.label.toLocaleLowerCase("es")}.` : "No hay configuraciones pendientes."}</p></div>
      <Link className="btn" href="/integrations">Revisar integraciones <ArrowRight size={13} /></Link>
    </section>

    <section className="settings-overview" aria-label="Resumen del sistema">
      <article><span className="settings-overview-icon positive"><Check size={16} /></span><div><strong>{ready}</strong><small>componentes operativos</small></div></article>
      <article><span className={`settings-overview-icon ${pending ? "attention" : "positive"}`}><AlertCircle size={16} /></span><div><strong>{pending}</strong><small>acciones pendientes</small></div></article>
      <article><span className="settings-overview-icon"><ShieldCheck size={16} /></span><div><strong>{bulkSendingEnabled ? "Producción" : "Protegido"}</strong><small>modo de envío actual</small></div></article>
    </section>

    <section className="card settings-status-card" aria-labelledby="service-health-title">
      <header><div><h2 id="service-health-title">Componentes del sistema</h2><p>Un resumen claro de lo que funciona y lo que aún necesita configuración.</p></div><span>{ready}/{checks.length} listos</span></header>
      <div className="settings-status-list">{checks.map((check) => { const Icon = icons[check.icon]; return <article className={check.ready ? "ready" : "pending"} key={check.label}>
        <span className="settings-service-icon"><Icon size={16} /></span><div><strong>{check.label}</strong><p>{check.detail}</p></div><span className="settings-service-state">{check.ready ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}{check.ready ? "Listo" : "Pendiente"}</span>
      </article>; })}</div>
    </section>

    <section className={`environment-banner compact ${bulkSendingEnabled ? "ready" : "locked"}`}>
      <span className="environment-icon"><LockKeyhole size={17}/></span>
      <div><strong>{bulkSendingEnabled ? "Envíos masivos habilitados" : "Protección contra envíos accidentales"}</strong><p>{bulkSendingEnabled ? "Las campañas aprobadas pueden enviarse a su audiencia." : "Puedes realizar pruebas individuales, pero una campaña completa no se enviará por accidente."}</p></div>
      <span className={`badge ${bulkSendingEnabled ? "success" : "pending"}`}>{bulkSendingEnabled ? "Activo" : "Protegido"}</span>
    </section>
  </div>;
}
