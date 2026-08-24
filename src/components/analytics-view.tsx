"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, MailCheck, MousePointerClick, Send, UserMinus } from "lucide-react";
import type { Contact, Site } from "@/src/domain/types";
import type { ResendUsage } from "@/src/database/repositories";

type EmailItem = { id: string; to: string; subject: string; date: string; status: string; siteId: string; events: string[] };
type Props = { sites: Site[]; contacts: Contact[]; outboundEmails: EmailItem[]; usage?: ResendUsage; initialSiteId?: string; campaigns?: unknown[] };
const terminalDelivery = ["email.delivered", "email.opened", "email.clicked"];
const has = (email: EmailItem, event: string) => email.events.includes(event) || email.status === event.replace("email.", "");
const percent = (value: number, total: number) => total ? `${((value / total) * 100).toFixed(1)}%` : "0.0%";

const normalizeSite = (s?: string) => (s ?? "").toLowerCase().replace(/^area-?/, "");

export function AnalyticsView({ sites, contacts, outboundEmails, usage, initialSiteId = "all" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [siteId, setSiteId] = useState(initialSiteId);
  const [range, setRange] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    setSiteId(initialSiteId);
  }, [initialSiteId]);

  const handleSiteChange = (newSite: string) => {
    setSiteId(newSite);
    try {
      localStorage.setItem("area-mail-selected-site", newSite);
    } catch {
      // Ignore storage errors
    }
    const next = new URLSearchParams(params?.toString() ?? "");
    if (newSite === "all") next.delete("site");
    else next.set("site", newSite);
    router.push(`${pathname}${next.toString() ? `?${next}` : ""}`);
  };

  const filtered = useMemo(() => {
    const cutoff = Date.now() - range * 86400000;
    return outboundEmails.filter((email) => {
      const emailTime = new Date(email.date).getTime();
      const inRange = !Number.isNaN(emailTime) ? emailTime >= cutoff : true;
      const match = siteId === "all" || normalizeSite(email.siteId) === normalizeSite(siteId);
      return inRange && match;
    });
  }, [outboundEmails, range, siteId]);
  const stats = useMemo(() => {
    const delivered = filtered.filter((email) => email.events.some((event) => terminalDelivery.includes(event)) || terminalDelivery.some((event) => has(email, event))).length;
    const opened = filtered.filter((email) => has(email, "email.opened") || has(email, "email.clicked")).length;
    const clicked = filtered.filter((email) => has(email, "email.clicked")).length;
    const bounced = filtered.filter((email) => has(email, "email.bounced")).length;
    const complained = filtered.filter((email) => has(email, "email.complained")).length;
    const suppressed = filtered.filter((email) => has(email, "email.suppressed")).length;
    return { sent: filtered.length, delivered, opened, clicked, bounced, complained, suppressed };
  }, [filtered]);
  const audience = contacts.filter((contact) => siteId === "all" || contact.siteIds?.some((id) => normalizeSite(id) === normalizeSite(siteId)));
  const unsubscribed = audience.filter((contact) => contact.status === "unsubscribed").length;
  const currentUsage = siteId === "all" ? usage : usage?.bySite?.[siteId] ?? usage?.bySite?.[normalizeSite(siteId)];
  const exportCsv = () => {
    const lines = ["Fecha,Marca,Destinatario,Asunto,Estado", ...filtered.map((e) => [e.date, e.siteId, e.to, e.subject, e.status].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))];
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    link.download = `area-mail-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click(); URL.revokeObjectURL(link.href);
  };
  const cards = [
    { label: "Envíos aceptados", value: stats.sent, detail: "Registrados por Area Mail", icon: Send },
    { label: "Entregados", value: stats.delivered, detail: percent(stats.delivered, stats.sent), icon: MailCheck },
    { label: "Aperturas", value: stats.opened, detail: percent(stats.opened, stats.delivered), icon: CheckCircle2 },
    { label: "Clics", value: stats.clicked, detail: percent(stats.clicked, stats.delivered), icon: MousePointerClick },
  ];
  return <div className="analytics-compact">
    <section className="card analytics-toolbar"><div><strong>Actividad real</strong><small>Solo eventos recibidos y guardados por el sistema.</small></div><div className="analytics-controls"><select aria-label="Marca" value={siteId} onChange={(e) => handleSiteChange(e.target.value)}><option value="all">Todas las marcas</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select><div className="analytics-range">{([7, 30, 90] as const).map((days) => <button type="button" className={range === days ? "active" : ""} key={days} onClick={() => setRange(days)}>{days} días</button>)}</div><button type="button" className="btn" onClick={exportCsv}><Download size={14}/>Exportar</button></div></section>
    <section className="analytics-kpis">{cards.map(({ label, value, detail, icon: Icon }) => <article className="card" key={label}><span><Icon size={17}/></span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></article>)}</section>
    <section className="analytics-summary-grid"><article className="card analytics-status"><header><div><h2>Entregabilidad</h2><p>Resultado confirmado por webhooks de Resend.</p></div><strong>{percent(stats.delivered, stats.sent)}</strong></header><div><span><i className="ok"/>Entregados <b>{stats.delivered}</b></span><span><i className="warn"/>Rebotados <b>{stats.bounced}</b></span><span><i className="danger"/>Quejas <b>{stats.complained}</b></span><span><i/>Suprimidos <b>{stats.suppressed}</b></span></div>{stats.sent > 0 && stats.delivered === 0 && <p className="analytics-note"><AlertTriangle size={14}/>Hay envíos sin confirmación de entrega. Revisa los webhooks de la marca.</p>}</article><article className="card analytics-audience"><header><div><h2>Audiencia y capacidad</h2><p>La audiencia y el cupo respetan la marca seleccionada.</p></div><UserMinus size={18}/></header><dl><div><dt>Contactos de la marca</dt><dd>{audience.length}</dd></div><div><dt>Bajas registradas</dt><dd>{unsubscribed}</dd></div><div><dt>Envíos hoy</dt><dd>{currentUsage?.todayCount ?? 0}/{currentUsage?.dailyLimit ?? 0}</dd></div><div><dt>Envíos este mes</dt><dd>{currentUsage?.monthCount ?? 0}/{currentUsage?.monthlyLimit ?? 0}</dd></div></dl><small>Los límites muestran los envíos que salieron desde Area Mail; Resend contabiliza cada destinatario.</small></article></section>
  </div>;
}
