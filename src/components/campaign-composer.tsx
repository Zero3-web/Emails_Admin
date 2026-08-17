"use client";
/* eslint-disable @next/next/no-img-element -- Images are external snapshots from Tokko and WordPress. */
import { Check, ChevronLeft, ChevronRight, Eye, FileText, Info, Loader2, Plus, Search, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AutomationType,
  BlogPost,
  Contact,
  ContactInterest,
  Property,
  Site,
} from "@/src/domain/types";

const options: Array<{ value: AutomationType; label: string; description: string; limit: number }> =
  [
    {
      value: "weekly_new_properties",
      label: "Nuevas oficinas de la semana",
      description: "Selección breve con las oficinas publicadas recientemente.",
      limit: 5,
    },
    { value: "monthly_properties", label: "Oficinas disponibles", description: "Catálogo mensual con una selección más amplia de propiedades.", limit: 10 },
    { value: "monthly_blog", label: "Novedades del blog", description: "Resumen editorial con artículos y novedades recientes.", limit: 5 },
  ];
const audienceOptions: Array<{ value: ContactInterest; label: string }> = [
  { value: "prime", label: "Interés: oficinas" },
  { value: "retail", label: "Interés: locales comerciales" },
  { value: "hub", label: "Interés: industrial" },
];

export function CampaignComposer({
  sites,
  properties,
  posts,
  contacts,
  contactsReady,
  initialOpen = false,
}: {
  sites: Site[];
  properties: Property[];
  posts: BlogPost[];
  contacts: Contact[];
  contactsReady: boolean;
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [step, setStep] = useState(1);
  const [contentQuery, setContentQuery] = useState("");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [type, setType] = useState<AutomationType>("weekly_new_properties");
  const [name, setName] = useState("Nuevas oficinas de la semana");
  const [subject, setSubject] = useState(
    "Nuevas oficinas disponibles en Área Prime",
  );
  const [introduction, setIntroduction] = useState(
    "Descubre las oportunidades seleccionadas para tu empresa.",
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [audienceInterest, setAudienceInterest] = useState<ContactInterest>("prime");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const config = options.find((item) => item.value === type)!;
  const available = useMemo(
    () =>
      type === "monthly_blog"
        ? posts.filter((item) => item.siteId === siteId)
        : properties.filter(
            (item) => item.siteId === siteId && Boolean(item.publicUrl),
          ),
    [type, siteId, posts, properties],
  );
  const audienceCount = useMemo(
    () => contacts.filter((contact) => contact.status === "active" && contact.siteIds.includes(siteId) && contact.interests.includes(audienceInterest)).length,
    [contacts, siteId, audienceInterest],
  );
  const audienceCounts = useMemo(
    () => Object.fromEntries(audienceOptions.map((option) => [option.value, contacts.filter((contact) => contact.status === "active" && contact.siteIds.includes(siteId) && contact.interests.includes(option.value)).length])) as Record<ContactInterest, number>,
    [contacts, siteId],
  );
  const filteredAvailable = useMemo(() => {
    const query = contentQuery.trim().toLocaleLowerCase("es-PE");
    if (!query) return available.slice(0, 20);
    return available.filter((item) => {
      const detail = "location" in item ? item.location : item.excerpt;
      return `${item.title} ${detail}`.toLocaleLowerCase("es-PE").includes(query);
    }).slice(0, 20);
  }, [available, contentQuery]);
  const previewItem = available.find((item) => item.id === previewId);
  function changeType(next: AutomationType) {
    const option = options.find((item) => item.value === next)!;
    setType(next);
    setName(option.label);
    setSelected([]);
    setSubject(
      next === "monthly_blog"
        ? "Novedades y tendencias de oficinas"
        : next === "monthly_properties"
          ? "Oficinas disponibles en Área Prime"
          : "Nuevas oficinas disponibles en Área Prime",
    );
  }
  function toggle(id: string) {
    setSelected((items) =>
      items.includes(id)
        ? items.filter((item) => item !== id)
        : items.length < config.limit
          ? [...items, id]
          : items,
    );
  }
  async function create() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteId,
          type,
          name,
          subject,
          introduction,
          audienceInterest,
          itemIds: selected,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.error ?? "No se pudo crear la campaña.");
      router.push(`/campaigns/${result.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo crear la campaña.",
      );
      setSaving(false);
    }
  }
  if (!open)
    return (
      <button
        className="btn primary"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Plus size={15} />
        Nueva campaña
      </button>
    );
  return (
    <section className="card campaign-composer">
      <header className="campaign-composer-head">
        <div>
          <span className="eyebrow">Nuevo borrador</span>
          <h2>{step === 1 ? "Información" : step === 2 ? "Seleccionar contenido" : "Audiencia y revisión"}</h2>
          <p>Paso {step} de 3</p>
        </div>
        <button
          className="icon-btn"
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
      </header>
      <nav className="campaign-steps" aria-label="Progreso de campaña">
        {["Información", "Contenido", "Audiencia"].map((label, index) => (
          <button key={label} type="button" className={step === index + 1 ? "active" : step > index + 1 ? "complete" : ""} onClick={() => index + 1 < step && setStep(index + 1)}>
            <span>{step > index + 1 ? <Check size={12} /> : index + 1}</span>{label}
          </button>
        ))}
      </nav>

      {step === 1 && <div className="campaign-form-grid campaign-step-panel" key="campaign-step-1">
        <div className="campaign-brand-field">
          <span className="campaign-field-label">Marca</span>
          <div className="campaign-brand-options" role="listbox" aria-label="Seleccionar marca">
            {sites.map((site) => (
              <button key={site.id} type="button" role="option" aria-selected={siteId === site.id} className={siteId === site.id ? "active" : ""} onClick={() => { setSiteId(site.id); setSelected([]); }}>
                <span style={{ backgroundColor: site.primaryColor }}>{site.name.slice(0, 2).toUpperCase()}</span>
                <strong>{site.name}</strong>
                {siteId === site.id && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>

        <fieldset className="campaign-template-field">
          <legend>Plantilla</legend>
          <div className="campaign-template-options">
            {options.map((item) => (
              <button key={item.value} type="button" aria-pressed={type === item.value} className={`campaign-template-option ${type === item.value ? "active" : ""}`} onClick={() => changeType(item.value)}>
                <span className={`campaign-template-mini ${item.value}`} aria-hidden="true"><i /><b /><b /><em /></span>
                <span><strong>{item.label}</strong><small>{item.description}</small></span>
                <span className="campaign-template-check">{type === item.value && <Check size={13} />}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="field campaign-name-field">
          <span className="campaign-label-with-help">Nombre interno <button type="button" className="campaign-help" aria-label="Ayuda sobre el nombre interno"><Info size={13} /><span>Solo lo verá tu equipo. Sirve para identificar esta campaña en listados e informes.</span></button></span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="field campaign-subject-field">
          <span>Asunto</span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </label>
        <label className="field full campaign-intro-field">
          <span>Introducción</span>
          <textarea
            rows={3}
            value={introduction}
            onChange={(event) => setIntroduction(event.target.value)}
          />
        </label>
      </div>}

      {step === 2 && <div className="campaign-step-panel campaign-content-step" key="campaign-step-2">
        <div className="campaign-content-head">
          <div><strong>Contenido disponible</strong><span>{selected.length}/{config.limit} seleccionados</span></div>
          {available.length > 0 && (
          <button
            className="btn subtle"
            type="button"
            onClick={() =>
              setSelected(
                available.slice(0, config.limit).map((item) => item.id),
              )
            }
          >
            Elegir recientes
          </button>
          )}
        </div>
        <label className="campaign-content-search"><Search size={15} /><input value={contentQuery} onChange={(event) => setContentQuery(event.target.value)} placeholder="Buscar por título o ubicación" /></label>
        <div className="campaign-picker" aria-label="Contenido disponible">
        {filteredAvailable.map((item) => {
          const active = selected.includes(item.id);
          const detail = "location" in item ? `${item.location}${item.area ? ` · ${item.area} m²` : ""}` : item.excerpt;
          return (
            <article key={item.id} className={`campaign-pick ${active ? "active" : ""}`}>
              <button type="button" className="campaign-pick-image" onClick={() => setPreviewId(item.id)} aria-label={`Previsualizar ${item.title}`}>
                {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <FileText size={20} />}
                <span><Eye size={14} />Vista previa</span>
              </button>
              <button type="button" className="campaign-pick-body" onClick={() => toggle(item.id)} aria-pressed={active}>
                <span><strong>{item.title}</strong><em>{detail}</em></span>
                <span className="campaign-check">{active && <Check size={14} />}</span>
              </button>
            </article>
          );
        })}
        {!filteredAvailable.length && <p className="campaign-picker-empty">No encontramos contenido con esa búsqueda.</p>}
        </div>
        {available.length > filteredAvailable.length && <p className="campaign-results-note">Mostrando 20 resultados. Usa el buscador para encontrar contenido específico.</p>}
      </div>}

      {step === 3 && <div className="campaign-step-panel campaign-review-step" key="campaign-step-3">
      <section className="campaign-audience">
        <div className="campaign-audience-heading">
          <span className="campaign-audience-icon"><UsersRound size={17} /></span>
          <div><strong>Elige a quién llegará</strong><span>Solo incluiremos contactos activos, con consentimiento y vinculados a esta marca.</span></div>
        </div>
        <div className="campaign-audience-options" role="radiogroup" aria-label="Segmento de audiencia">
          {audienceOptions.map((option) => {
            const count = audienceCounts[option.value];
            const active = audienceInterest === option.value;
            return <button key={option.value} type="button" role="radio" aria-checked={active} className={active ? "active" : ""} onClick={() => setAudienceInterest(option.value)}>
              <span className="campaign-radio">{active && <span />}</span>
              <span><strong>{option.label.replace("Interés: ", "")}</strong><small>{contactsReady ? `${count.toLocaleString("es-PE")} contactos elegibles` : "Contactos sin configurar"}</small></span>
            </button>;
          })}
        </div>
        <div className={`campaign-audience-total ${audienceCount ? "ready" : "empty"}`}>
          <span>Destinatarios</span><strong>{contactsReady ? audienceCount.toLocaleString("es-PE") : "—"}</strong>
          {!audienceCount && contactsReady && <a href="/contacts">Agregar contactos</a>}
        </div>
      </section>
        <dl className="campaign-review-summary">
          <div><dt>Campaña</dt><dd>{name}</dd></div>
          <div><dt>Contenido</dt><dd>{selected.length} de {config.limit} elementos</dd></div>
          <div><dt>Destinatarios</dt><dd>{contactsReady ? audienceCount.toLocaleString("es-PE") : "Sin configurar"}</dd></div>
          <div><dt>Estado inicial</dt><dd>Borrador pendiente de aprobación</dd></div>
        </dl>
      </div>}
      {previewItem && <div className="campaign-preview-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPreviewId(null)}>
        <section className="campaign-item-preview" role="dialog" aria-modal="true" aria-label={`Vista previa de ${previewItem.title}`}>
          <header><div><span>Vista previa</span><strong>{previewItem.title}</strong></div><button type="button" className="icon-btn" onClick={() => setPreviewId(null)} aria-label="Cerrar vista previa"><X size={18} /></button></header>
          <div className="campaign-item-preview-media">{previewItem.imageUrl ? <img src={previewItem.imageUrl} alt={previewItem.title} /> : <FileText size={32} />}</div>
          <div className="campaign-item-preview-copy"><p>{"location" in previewItem ? previewItem.description : previewItem.excerpt}</p><a href={previewItem.publicUrl} target="_blank" rel="noreferrer">Abrir publicación</a></div>
        </section>
      </div>}
      {error && (
        <p className="notice error" role="status">
          {error}
        </p>
      )}
      <footer className="campaign-composer-foot">
        <div>{step > 1 && <button className="btn subtle" type="button" onClick={() => setStep(step - 1)}><ChevronLeft size={15} />Atrás</button>}</div>
        {step < 3 ? <button className="btn primary" type="button" onClick={() => setStep(step + 1)} disabled={step === 1 ? !name.trim() || !subject.trim() : !selected.length}>
          Continuar <ChevronRight size={15} />
        </button> : <button
          className="btn primary"
          type="button"
          onClick={() => void create()}
          disabled={
            saving || !selected.length || !name.trim() || !subject.trim() || !contactsReady || !audienceCount
          }
        >
          {saving ? (
            <Loader2 className="spin" size={15} />
          ) : (
            <Check size={15} />
          )}
          {saving ? "Guardando borrador…" : "Crear borrador"}
        </button>}
      </footer>
    </section>
  );
}
