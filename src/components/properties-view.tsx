"use client";

/* eslint-disable @next/next/no-img-element -- Property images are synchronized from external providers. */
import { Building2, Check, ChevronLeft, ChevronRight, ExternalLink, MapPin, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Property, Site } from "@/src/domain/types";
import { useDialogA11y } from "@/src/hooks/use-dialog-a11y";
import { segmentLabel, type PropertySegment } from "@/src/services/property-classifier";
import { FilterMenu } from "@/src/components/filter-menu";
import { getSiteInitials } from "@/src/components/ui";

const PAGE_SIZE = 12;
const propertyStatusLabel = (status: string) => {
  const normalized = status.trim().toLocaleLowerCase("es");
  if (["2", "active", "available", "published", "activo", "disponible"].includes(normalized)) return "Disponible";
  if (["inactive", "unavailable", "inactivo", "no disponible"].includes(normalized)) return "No disponible";
  return status || "Sin estado";
};

function formatDescription(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replace(/&(?:lt|gt);/g, "")
    .replace(/([A-Za-zÁÉÍÓÚáéíóúñÑ])(\$)/g, "$1 $2")
    .replace(/\)(\d)/g, ") $1")
    .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, "$1 $2")
    .replace(/([A-Za-zÁÉÍÓÚáéíóúñÑ])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-zÁÉÍÓÚáéíóúñÑ])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

export function PropertiesView({ properties, sites, initialSiteId = "" }: { properties: Property[]; sites: Site[]; initialSiteId?: string }) {
  const [query, setQuery] = useState("");
  const [siteId, setSiteId] = useState(initialSiteId);
  const [type, setType] = useState("");
  const [segment, setSegment] = useState("");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Property | null>(null);
  const previewRef = useDialogA11y<HTMLElement>(Boolean(preview), () => setPreview(null));
  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const types = useMemo(() => [...new Set(properties.map((property) => property.propertyType).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [properties]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es");
    return properties.filter((property) =>
      (!siteId || property.siteId === siteId) && (!type || property.propertyType === type) && (!segment || property.segment === segment) &&
      (!term || [property.title, property.location, property.address, property.externalId].some((value) => value.toLocaleLowerCase("es").includes(term)))
    );
  }, [properties, query, segment, siteId, type]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const resetPage = (action: () => void) => { action(); setPage(1); };
  const clearFilters = () => { setQuery(""); setSiteId(""); setType(""); setSegment(""); setPage(1); };
  const hasFilters = Boolean(query || siteId || type || segment);
  const linked = properties.filter((property) => Boolean(property.publicUrl)).length;

  return (
    <>
      <section className="content-summary" aria-label="Resumen del inventario">
        <article><span className="content-summary-icon"><Building2 size={16} /></span><div><strong>{properties.length.toLocaleString("es-PE")}</strong><span>propiedades sincronizadas</span></div></article>
        <article><span className="content-summary-icon positive"><ExternalLink size={16} /></span><div><strong>{linked.toLocaleString("es-PE")}</strong><span>con ficha pública</span></div></article>
        <article><span className="content-summary-icon"><Check size={16} /></span><div><strong>{sites.length}</strong><span>marcas disponibles</span></div></article>
      </section>

      <section className="card content-library-panel">
        <header><div><h2>Inventario visual</h2><p>Selecciona una propiedad para revisar sus datos antes de usarla en una campaña.</p></div><span>{filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}</span></header>
        <div className="content-toolbar">
          <label className="content-search"><Search size={14} /><input aria-label="Buscar propiedades" value={query} onChange={(event) => resetPage(() => setQuery(event.target.value))} placeholder="Buscar por título, ubicación o código" />{query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => resetPage(() => setQuery(""))}><X size={13} /></button>}</label>
          <div className="content-filter-group">
            <FilterMenu className="content-filter-menu" label="Filtrar por marca" value={siteId} onChange={(value) => resetPage(() => setSiteId(value))} options={[{ value: "", label: "Todas las marcas" }, ...sites.map((site) => ({ value: site.id, label: site.name }))]} />
            <FilterMenu className="content-filter-menu" label="Filtrar por tipo" value={type} onChange={(value) => resetPage(() => setType(value))} options={[{ value: "", label: "Todos los tipos" }, ...types.map((item) => ({ value: item, label: item }))]} />
            <FilterMenu className="content-filter-menu" label="Filtrar por línea" value={segment} onChange={(value) => resetPage(() => setSegment(value))} options={[{ value: "", label: "Todas las líneas" }, ...(["prime", "retail", "hub", "unclassified"] as PropertySegment[]).map((item) => ({ value: item, label: segmentLabel(item) }))]} />
            {hasFilters && <button className="content-clear" type="button" onClick={clearFilters}>Limpiar</button>}
          </div>
        </div>

        {visible.length ? <div className="library-property-grid">
          {visible.map((property) => {
            const site = siteById.get(property.siteId);
            return <article className="library-property-card" key={property.id}>
              <button className="library-property-media" type="button" onClick={() => setPreview(property)} aria-label={`Vista previa de ${property.title}`}>
                {property.imageUrl ? <img src={property.imageUrl} alt="" loading="lazy" /> : <span><Building2 size={24} /></span>}<i>{propertyStatusLabel(property.status)}</i>
              </button>
              <div className="library-property-body">
                <div className="library-property-brand">{site?.logoUrl ? <img src={site.logoUrl} alt={site.name} style={{ width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover", marginRight: "6px", background: "#ffffff", display: "inline-block", verticalAlign: "middle" }} /> : <span style={{ background: site?.primaryColor || "#4f46e5" }}>{getSiteInitials(site?.name || segmentLabel(property.segment))}</span>}<small>{site?.name ?? segmentLabel(property.segment)}</small></div>
                <button type="button" onClick={() => setPreview(property)}><strong>{property.title}</strong></button>
                <p><MapPin size={12} />{property.location || property.address || "Ubicación no informada"}</p>
                <div><span>{property.propertyType || "Sin tipo"}</span>{property.area > 0 && <span>{property.area.toLocaleString("es-PE")} m²</span>}</div>
              </div>
            </article>;
          })}
        </div> : <div className="content-empty"><span><Search size={20} /></span><h3>No encontramos propiedades</h3><p>Prueba con una búsqueda más amplia o elimina alguno de los filtros.</p><button className="btn" type="button" onClick={clearFilters}>Limpiar filtros</button></div>}

        {totalPages > 1 && <footer className="content-pagination"><span>Página {currentPage} de {totalPages}</span><div><button type="button" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={14} /></button><button type="button" aria-label="Página siguiente" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={14} /></button></div></footer>}
      </section>

      {preview && <div className="content-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
        <section ref={previewRef} className="content-preview-modal" role="dialog" aria-modal="true" aria-labelledby="property-preview-title" tabIndex={-1}>
          <button className="content-preview-close" type="button" aria-label="Cerrar vista previa" onClick={() => setPreview(null)}><X size={17} /></button>
          <div className="content-preview-image">{preview.imageUrl ? <img src={preview.imageUrl} alt={`Imagen de ${preview.title}`} /> : <Building2 size={34} />}</div>
          <div className="content-preview-copy"><span className="eyebrow">Vista previa de propiedad</span><h2 id="property-preview-title">{preview.title}</h2><p className="content-preview-location"><MapPin size={13} />{preview.location || preview.address || "Ubicación no informada"}</p>
            <div className="content-preview-facts"><div><span>Marca</span><strong>{siteById.get(preview.siteId)?.name ?? segmentLabel(preview.segment)}</strong></div><div><span>Tipo</span><strong>{preview.propertyType || "Sin tipo"}</strong></div><div><span>Área</span><strong>{preview.area > 0 ? `${preview.area.toLocaleString("es-PE")} m²` : "No informada"}</strong></div><div><span>Precio</span><strong>{preview.price > 0 ? `${preview.currency} ${preview.price.toLocaleString("es-PE")}` : "No publicado"}</strong></div></div>
            {preview.description && <div className="content-preview-description"><strong>Descripción</strong><p>{formatDescription(preview.description)}</p></div>}
            <div className="content-preview-actions"><button className="btn" type="button" onClick={() => setPreview(null)}>Cerrar</button>{preview.publicUrl && <a className="btn primary" href={preview.publicUrl} target="_blank" rel="noreferrer">Abrir ficha pública <ExternalLink size={13} /></a>}</div>
          </div>
        </section>
      </div>}
    </>
  );
}
