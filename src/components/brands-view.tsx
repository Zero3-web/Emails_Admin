"use client";

import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Mail, Plus, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { SiteCreateForm } from "@/src/components/site-create-form";
import { useDialogA11y } from "@/src/hooks/use-dialog-a11y";
import type { Integration, Site } from "@/src/domain/types";

export function BrandsView({ sites, integrations, propertyCounts, contactCounts }: { sites: Site[]; integrations: Integration[]; propertyCounts: Record<string, number>; contactCounts: Record<string, number> }) {
  const [creating, setCreating] = useState(false);
  const createRef = useDialogA11y<HTMLElement>(creating, () => setCreating(false));
  const active = sites.filter((site) => site.isActive).length;

  return <>
    <section className="brand-overview" aria-label="Resumen de marcas">
      <article><span className="brand-overview-icon positive"><CheckCircle2 size={16}/></span><div><strong>{active}</strong><small>marcas activas</small></div></article>
      <article><span className="brand-overview-icon"><Building2 size={16}/></span><div><strong>{Object.values(propertyCounts).reduce((total, value) => total + value, 0).toLocaleString("es-PE")}</strong><small>propiedades vinculadas</small></div></article>
      <article><span className="brand-overview-icon"><UsersRound size={16}/></span><div><strong>{Object.values(contactCounts).reduce((total, value) => total + value, 0).toLocaleString("es-PE")}</strong><small>contactos suscritos</small></div></article>
      <button type="button" onClick={() => setCreating(true)}><Plus size={15}/><span><strong>Nueva marca</strong><small>Conectar otro dominio</small></span></button>
    </section>

    <section className="card brands-panel">
      <header><div><h2>Marcas registradas</h2><p>Identidad, remitente, contenido y conexiones de cada operación.</p></div><span>{sites.length} {sites.length === 1 ? "marca" : "marcas"}</span></header>
      <div className="brands-list">{sites.map((site) => {
        const siteIntegrations = integrations.filter((item) => item.siteId === site.id);
        const ready = siteIntegrations.filter((item) => item.status === "connected").length;
        return <article key={site.id}>
          {(() => {
            const initials = site.name.trim().split(/\s+/).slice(0,2).map((word) => word[0]).join("").toUpperCase();
            return site.logoUrl ? (
              <img src={site.logoUrl} alt={site.name} className="brand-mark-large" style={{ objectFit: "cover", background: "#ffffff" }} />
            ) : (
              <span className="brand-mark-large" style={{background:"#ccff00", color:"#000000", fontWeight:800}}>{initials}</span>
            );
          })()}
          <div className="brand-main"><span className={`brand-state ${site.isActive ? "active" : "inactive"}`}>{site.isActive ? "Activa" : "Inactiva"}</span><h3>{site.name}</h3><p>{site.domain}</p></div>
          <div className="brand-fact"><span>Contenido</span><strong>{propertyCounts[site.id] ?? 0} propiedades</strong></div>
          <div className="brand-fact"><span>Audiencia</span><strong>{contactCounts[site.id] ?? 0} contactos</strong></div>
          <div className="brand-fact"><span>Conexiones</span><strong>{ready}/{siteIntegrations.length} operativas</strong></div>
          <div className="brand-sender"><Mail size={13}/><span><small>Remitente</small><strong>{site.senderEmail || "No configurado"}</strong></span></div>
          <Link className="btn" href={`/sites/${site.id}`}>Administrar <ArrowRight size={13}/></Link>
        </article>;
      })}</div>
    </section>

    {creating && <div className="brand-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreating(false); }}><section ref={createRef} className="brand-create-modal" role="dialog" aria-modal="true" aria-label="Crear nueva marca" tabIndex={-1}><button className="brand-modal-close" type="button" aria-label="Cerrar" onClick={() => setCreating(false)}><X size={17}/></button><SiteCreateForm onCancel={() => setCreating(false)}/></section></div>}
  </>;
}
