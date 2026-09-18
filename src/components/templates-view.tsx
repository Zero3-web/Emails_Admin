"use client";

import { Check, CheckCircle2, ExternalLink, FileText, Monitor, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import type { Site } from "@/src/domain/types";

type TemplateType = "weekly_new_properties" | "monthly_properties" | "monthly_blog";
type Preview = { html: string; subject: string; itemCount: number };
const templates: Array<{ type: TemplateType; name: string; description: string; cadence: string; kind: string }> = [
  { type: "weekly_new_properties", name: "Nuevas oficinas", description: "Una selección breve con hasta 5 incorporaciones recientes.", cadence: "Semanal", kind: "Propiedades" },
  { type: "monthly_properties", name: "Oficinas disponibles", description: "Catálogo ampliado con hasta 10 oficinas activas.", cadence: "Mensual", kind: "Propiedades" },
  { type: "monthly_blog", name: "Novedades del blog", description: "Resumen editorial con hasta 5 artículos recientes.", cadence: "Mensual", kind: "Artículos" },
];

export function TemplatesView({ sites, initialSiteId }: { sites: Site[]; initialSiteId: string; propertyCounts?: Record<string, number>; blogCounts?: Record<string, number> }) {
  const [siteId, setSiteId] = useState(initialSiteId);
  const [type, setType] = useState<TemplateType>("weekly_new_properties");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const site = sites.find((item) => item.id === siteId) ?? sites[0];
  const activeTemplate = templates.find((item) => item.type === type)!;

  useEffect(() => {
    setSiteId(initialSiteId);
  }, [initialSiteId]);

  useEffect(() => {
    const onSiteChange = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail && custom.detail !== "all" && sites.some((s) => s.id === custom.detail)) {
        setSiteId(custom.detail);
      }
    };
    window.addEventListener("area-mail-site-change", onSiteChange);
    return () => window.removeEventListener("area-mail-site-change", onSiteChange);
  }, [sites]);

  function selectType(nextType: TemplateType) { if (nextType !== type) { setPreview(null); setLoading(true); setType(nextType); } }

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch(`/api/templates/preview?siteId=${encodeURIComponent(siteId)}&type=${type}`, { cache: "force-cache", signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error ?? "No se pudo generar la vista previa.");
        setPreview(result);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo generar la vista previa.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [siteId, type]);

  return (
    <div className="templates-library">
      <section className="template-setup" aria-label="Configurar vista previa">
        <div className="template-setup-head">
          <div>
            <h2>Configura la vista</h2>
            <p>Elige un diseño para comprobar el resultado real de <strong>{site.name}</strong>.</p>
          </div>
          <span><CheckCircle2 size={14} />Contenido conectado</span>
        </div>
        <div className="template-card-grid" role="radiogroup" aria-label="Diseño del correo">
          {templates.map((template) => <button key={template.type} type="button" role="radio" aria-checked={type === template.type} className={`template-design-card ${type === template.type ? "active" : ""}`} onClick={() => selectType(template.type)}>
            <span className="template-miniature" aria-hidden="true"><i></i><b></b><b></b><em></em></span>
            <span className="template-design-copy"><small>{template.cadence} · {template.kind}</small><strong>{template.name}</strong><em>{template.description}</em></span>
            <i className="template-design-check">{type === template.type && <Check size={12} />}</i>
          </button>)}
        </div>
      </section>

      <section className="card template-preview-panel refined">
        <header className="template-preview-head">
          <div><span className="eyebrow">Vista previa real</span><h2>{activeTemplate.name}</h2><p>{preview?.subject ?? "Preparando asunto…"} · {preview?.itemCount ?? 0} {type === "monthly_blog" ? "artículos" : "propiedades"}</p></div>
          <div className={`device-switch labeled is-${device}`} role="group" aria-label="Tamaño de la vista previa">
            <button type="button" aria-pressed={device === "desktop"} className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")}><Monitor size={14} /><span>Desktop</span></button>
            <button type="button" aria-pressed={device === "mobile"} className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")}><Smartphone size={14} /><span>Móvil</span></button>
          </div>
        </header>
        <div className={`template-stage refined ${device}`}>
          {loading ? <div className="template-preview-skeleton" role="status"><span></span><div><i></i><i></i><i></i></div><b></b><b></b><small>Preparando vista previa…</small></div> : error ? <div className="template-preview-error"><FileText size={20} /><strong>No pudimos generar la vista</strong><span>{error}</span></div> : preview ? <iframe className="template-preview-frame" title={`Vista previa de ${site.name}`} srcDoc={preview.html} sandbox="allow-popups allow-popups-to-escape-sandbox" /> : null}
        </div>
        <footer className="template-preview-foot"><span>Así se verá el correo con la identidad y el contenido de {site.name}.</span><a href={type === "monthly_blog" ? `https://${site.domain}/blog/` : `/properties?site=${site.id}`} target={type === "monthly_blog" ? "_blank" : undefined} rel={type === "monthly_blog" ? "noreferrer" : undefined}>Revisar contenido <ExternalLink size={13} /></a></footer>
      </section>
    </div>
  );
}
