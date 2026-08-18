"use client";
/* eslint-disable @next/next/no-img-element -- Images are external snapshots from Tokko and WordPress. */
import { Check, ChevronLeft, ChevronRight, Eye, FileText, Info, Loader2, Plus, Search, UsersRound, X } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDialogA11y } from "@/src/hooks/use-dialog-a11y";
import type {
  AutomationType,
  BlogPost,
  Contact,
  ContactInterest,
  Property,
  Site,
} from "@/src/domain/types";
import { getSiteInitials } from "@/src/components/ui";

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

const getSiteSegment = (site?: Site): "prime" | "retail" | "hub" => {
  if (!site) return "prime";
  const slug = site.slug.toLowerCase();
  if (slug.includes("prime")) return "prime";
  if (slug.includes("retail")) return "retail";
  if (slug.includes("hub")) return "hub";
  return "prime";
};

export function CampaignComposer({
  sites,
  properties,
  posts,
  contacts,
  contactsReady,
  initialOpen = false,
  onClose,
}: {
  sites: Site[];
  properties: Property[];
  posts: BlogPost[];
  contacts: Contact[];
  contactsReady: boolean;
  initialOpen?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [step, setStep] = useState(1);
  const [contentQuery, setContentQuery] = useState("");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [type, setType] = useState<AutomationType>("weekly_new_properties");
  const [name, setName] = useState("Nuevas oficinas de la semana");
  const [subject, setSubject] = useState(() => {
    const initialSite = sites[0];
    return initialSite ? `Nuevas oficinas disponibles en ${initialSite.name}` : "Nuevas oficinas disponibles";
  });
  const [introduction, setIntroduction] = useState(
    "Descubre las oportunidades seleccionadas para tu empresa.",
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [audienceInterest, setAudienceInterest] = useState<ContactInterest>("prime");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const [stepMessage, setStepMessage] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [customEmails, setCustomEmails] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");

  useEffect(() => {
    if (sites.length > 0) {
      const exists = sites.some((site) => site.id === siteId);
      if (!exists) {
        setSiteId(sites[0].id);
      }
    }
  }, [sites, siteId]);

  const currentSite = useMemo(() => sites.find((s) => s.id === siteId), [sites, siteId]);
  const siteSegment = useMemo(() => getSiteSegment(currentSite), [currentSite]);

  useEffect(() => {
    setAudienceInterest(siteSegment);
  }, [siteSegment]);
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
  const filteredSearchContacts = useMemo(() => {
    const q = recipientInput.trim().toLowerCase();
    if (q.length < 2) return [];
    return contacts.filter(
      (contact) =>
        contact.siteIds.includes(siteId) &&
        (contact.email.toLowerCase().includes(q) ||
          `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [contacts, siteId, recipientInput]);

  const addCustomEmail = (emailStr: string) => {
    const emails = emailStr
      .split(/[\s,;\n]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@") && e.length > 3);
    setCustomEmails((prev) => {
      const next = [...prev];
      for (const email of emails) {
        if (!next.includes(email)) {
          next.push(email);
        }
      }
      return next;
    });
    setRecipientInput("");
  };

  const removeCustomEmail = (email: string) => {
    setCustomEmails((prev) => prev.filter((e) => e !== email));
  };

  const audienceCount = useMemo(
    () =>
      customEmails.length === 0
        ? contacts.filter((contact) => contact.status === "active" && contact.siteIds.includes(siteId) && contact.interests.includes(audienceInterest)).length
        : customEmails.length,
    [contacts, siteId, audienceInterest, customEmails],
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
  const composerRef = useDialogA11y<HTMLElement>(open && !previewItem, closeComposer);
  const previewRef = useDialogA11y<HTMLElement>(Boolean(previewItem), () => setPreviewId(null));
  function changeType(next: AutomationType) {
    const option = options.find((item) => item.value === next)!;
    const currentSite = sites.find((s) => s.id === siteId) || sites[0];
    const siteName = currentSite ? currentSite.name : "Área Prime";
    setType(next);
    setName(option.label);
    setSelected([]);
    setSubject(
      next === "monthly_blog"
        ? `Novedades y tendencias de ${siteName}`
        : next === "monthly_properties"
          ? `Oficinas disponibles en ${siteName}`
          : `Nuevas oficinas disponibles en ${siteName}`,
    );
  }
  function closeComposer() {
    if (closing || saving) return;
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      if (onClose) onClose();
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-dialog-return-focus]")?.focus({ preventScroll: true }));
    }, 150);
  }
  function toggle(id: string) {
    setStepMessage("");
    setSelected((items) =>
      items.includes(id)
        ? items.filter((item) => item !== id)
        : items.length < config.limit
          ? [...items, id]
          : items,
    );
  }
  function advance() {
    setAttemptedStep(step);
    setStepMessage("");
    if (step === 2 && (!name.trim() || !subject.trim())) {
      setStepMessage("Completa los campos marcados para continuar.");
      return;
    }
    if (step === 3 && !selected.length) {
      setStepMessage("Selecciona al menos un contenido para la campaña.");
      return;
    }
    setAttemptedStep(null);
    setStep(step + 1);
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
          customRecipients: customEmails.length > 0 ? customEmails : undefined,
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
  if (!open) {
    if (onClose) return null;
    return (
      <button
        className="btn primary"
        type="button"
        data-dialog-return-focus
        onClick={() => setOpen(true)}
      >
        <Plus size={15} />
        Nueva campaña
      </button>
    );
  }
  return (
    <section ref={composerRef} className={`card campaign-composer ${closing ? "is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="campaign-composer-title" tabIndex={-1}>
      <header className="campaign-composer-head">
        <div>
          <span className="eyebrow">Nuevo borrador</span>
          <h2 id="campaign-composer-title">{step === 1 ? "Plantilla" : step === 2 ? "Información" : step === 3 ? "Seleccionar contenido" : "Audiencia y revisión"}</h2>
          <p>Paso {step} de 4</p>
        </div>
        <button
          className="icon-btn"
          type="button"
          onClick={closeComposer}
          aria-label="Cerrar"
          data-dialog-initial-focus
        >
          <X size={18} />
        </button>
      </header>
      <nav className="campaign-steps" aria-label="Progreso de campaña">
        {["Plantilla", "Información", "Contenido", "Audiencia"].map((label, index) => (
          <button key={label} type="button" className={step === index + 1 ? "active" : step > index + 1 ? "complete" : ""} onClick={() => index + 1 < step && setStep(index + 1)}>
            <span>{step > index + 1 ? <Check size={12} /> : index + 1}</span>{label}
          </button>
        ))}
      </nav>

      {step === 1 && <div className="campaign-form-grid campaign-step-panel" key="campaign-step-1">
        <fieldset className="campaign-template-field" style={{ gridColumn: "1 / -1" }}>
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
      </div>}

      {step === 2 && <div className="campaign-form-grid campaign-step-panel" key="campaign-step-2">
        <label className="field campaign-name-field">
          <span className="campaign-label-with-help">Nombre interno <button type="button" className="campaign-help" aria-label="Ayuda sobre el nombre interno"><Info size={13} /><span>Solo lo verá tu equipo. Sirve para identificar esta campaña en listados e informes.</span></button></span>
          <input
            value={name}
            aria-invalid={attemptedStep === 2 && !name.trim()}
            aria-describedby="campaign-name-help"
            onChange={(event) => { setName(event.target.value); setStepMessage(""); }}
          />
          {attemptedStep === 2 && !name.trim() && <small className="field-error" id="campaign-name-help">Escribe un nombre para identificar esta campaña.</small>}
        </label>
        <label className="field campaign-subject-field">
          <span>Asunto</span>
          <input
            value={subject}
            aria-invalid={attemptedStep === 2 && !subject.trim()}
            aria-describedby="campaign-subject-help"
            onChange={(event) => { setSubject(event.target.value); setStepMessage(""); }}
          />
          {attemptedStep === 2 && !subject.trim() && <small className="field-error" id="campaign-subject-help">El correo necesita un asunto.</small>}
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

      {step === 3 && <div className="campaign-step-panel campaign-content-step" key="campaign-step-3">
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

      {step === 4 && <div className="campaign-step-panel campaign-review-step" key="campaign-step-4">
      <section className="campaign-audience">
        <div className="campaign-audience-heading">
          <span className="campaign-audience-icon"><UsersRound size={17} /></span>
          <div><strong>Configuración de Destinatarios</strong><span>Escribe o busca correos de destinatarios. Deja vacío para enviar a toda la base de datos de la marca.</span></div>
        </div>

        {/* Column 1: Recipients Multi-Select Input Box */}
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="campaign-composer-to-field" style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "13px" }}>Para:</label>
          <div className="email-recipients-input-wrapper" style={{
            border: "1px solid var(--am-border)",
            borderRadius: "6px",
            padding: "8px 12px",
            minHeight: "42px",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            alignItems: "center",
            background: "var(--am-surface)",
            cursor: "text",
            position: "relative"
          }}>
            {customEmails.map((email) => (
              <span key={email} style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "var(--am-surface-2)",
                border: "1px solid var(--am-border-strong)",
                borderRadius: "4px",
                padding: "2px 8px",
                fontSize: "12px",
                fontWeight: 500
              }}>
                {email}
                <button type="button" onClick={() => removeCustomEmail(email)} style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "inline-flex",
                  color: "var(--am-ink-muted)"
                }} aria-label={`Eliminar ${email}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
            
            <input
              id="campaign-composer-to-field"
              type="text"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "," || e.key === " ") {
                  e.preventDefault();
                  const email = recipientInput.trim().replace(/[,\s;]/g, "");
                  if (email && email.includes("@")) {
                    addCustomEmail(email);
                  }
                }
              }}
              onBlur={() => {
                const email = recipientInput.trim().replace(/[,\s;]/g, "");
                if (email && email.includes("@")) {
                  addCustomEmail(email);
                }
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (text && text.includes("@")) {
                  e.preventDefault();
                  addCustomEmail(text);
                }
              }}
              placeholder={customEmails.length === 0 ? `Todos los contactos de ${currentSite?.name} (${siteSegment === "prime" ? "Oficinas" : siteSegment === "retail" ? "Locales Comerciales" : "Industrial"})` : "Añadir correo..."}
              style={{
                border: "none",
                background: "none",
                outline: "none",
                flex: 1,
                minWidth: "220px",
                fontSize: "13px",
                color: "var(--am-ink)",
                padding: "4px 0"
              }}
            />

            {recipientInput.trim().includes("@") && (
              <button
                type="button"
                onClick={() => {
                  const email = recipientInput.trim().replace(/[,\s;]/g, "");
                  if (email && email.includes("@")) {
                    addCustomEmail(email);
                  }
                }}
                style={{
                  border: "none",
                  background: "var(--am-ink)",
                  color: "var(--am-surface)",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                  marginLeft: "4px"
                }}
                title="Agregar correo"
              >
                <Plus size={12} />
              </button>
            )}

            {filteredSearchContacts.length > 0 && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: "var(--am-surface-2)",
                border: "1px solid var(--am-border)",
                borderRadius: "6px",
                zIndex: 100,
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                marginTop: "4px"
              }}>
                {filteredSearchContacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => addCustomEmail(c.email)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      borderBottom: "1px solid var(--am-border-strong)",
                      color: "var(--am-ink)"
                    }}
                    className="search-contact-item-btn"
                  >
                    <strong>{c.firstName} {c.lastName}</strong> <span style={{ opacity: 0.7 }}>({c.email})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {customEmails.length > 0 && (
            <button
              type="button"
              onClick={() => setCustomEmails([])}
              style={{
                background: "none",
                border: "none",
                color: "var(--am-ink-muted)",
                fontSize: "11px",
                textDecoration: "underline",
                cursor: "pointer",
                padding: "6px 0 0",
                display: "inline-block"
              }}
            >
              Restablecer a toda la base de datos
            </button>
          )}
        </div>

        {/* Column 2: Styled compact campaign-audience-total box */}
        <div className={`campaign-audience-total ${audienceCount ? "ready" : "empty"}`}>
          <span>Destinatarios</span>
          <strong>{contactsReady ? audienceCount.toLocaleString("es-PE") : "—"}</strong>
          <small style={{ fontSize: "10px", color: "var(--am-ink-muted)", marginTop: "2px", textAlign: "right" }}>
            {customEmails.length > 0 ? "Correos esp." : `${siteSegment === "prime" ? "Oficinas" : siteSegment === "retail" ? "Locales" : "Industrial"}`}
          </small>
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
        <section ref={previewRef} className="campaign-item-preview" role="dialog" aria-modal="true" aria-label={`Vista previa de ${previewItem.title}`} tabIndex={-1}>
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
      {stepMessage && <p className="campaign-step-feedback" role="alert">{stepMessage}</p>}
      <footer className="campaign-composer-foot">
        <div>{step > 1 && <button className="btn subtle" type="button" onClick={() => { setStepMessage(""); setAttemptedStep(null); setStep(step - 1); }}><ChevronLeft size={15} />Atrás</button>}</div>
        {step < 4 ? <button className="btn primary" type="button" onClick={advance}>
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
