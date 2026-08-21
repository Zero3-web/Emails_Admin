"use client";
/* eslint-disable @next/next/no-img-element -- Images are external snapshots from Tokko and WordPress. */
import { Check, ChevronLeft, ChevronRight, Eye, FileText, Info, Loader2, Mail, Plus, Search, UsersRound, X, Zap } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDialogA11y } from "@/src/hooks/use-dialog-a11y";
import * as XLSX from "xlsx";
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

const getSiteSegment = (site?: Site): "prime" | "retail" | "hub" => {
  if (!site) return "prime";
  const slug = site.slug.toLowerCase();
  if (slug.includes("prime")) return "prime";
  if (slug.includes("retail")) return "retail";
  if (slug.includes("hub")) return "hub";
  return "prime";
};

const getDefaultSubject = (site: Site | undefined, type: AutomationType) => {
  const name = site?.name ?? "Área Prime";
  const segment = getSiteSegment(site);
  if (type === "monthly_blog") return `Novedades y tendencias de ${name}`;
  if (segment === "hub") {
    return type === "monthly_properties"
      ? `Almacenes e inmuebles industriales disponibles en ${name}`
      : `Nuevas naves e inmuebles industriales en ${name}`;
  }
  if (segment === "retail") {
    return type === "monthly_properties"
      ? `Locales comerciales disponibles en ${name}`
      : `Nuevos locales comerciales en ${name}`;
  }
  return type === "monthly_properties"
    ? `Oficinas disponibles en ${name}`
    : `Nuevas oficinas disponibles en ${name}`;
};

const getDefaultName = (site: Site | undefined, type: AutomationType) => {
  const segment = getSiteSegment(site);
  if (type === "monthly_blog") return "Novedades del blog";
  if (segment === "hub") return type === "monthly_properties" ? "Inmuebles industriales disponibles" : "Nuevas naves industriales de la semana";
  if (segment === "retail") return type === "monthly_properties" ? "Locales comerciales disponibles" : "Nuevos locales comerciales de la semana";
  return type === "monthly_properties" ? "Oficinas disponibles" : "Nuevas oficinas de la semana";
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(initialOpen);
  const [step, setStep] = useState(1);
  const [contentQuery, setContentQuery] = useState("");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [type, setType] = useState<AutomationType>("weekly_new_properties");

  const currentSite = useMemo(() => sites.find((s) => s.id === siteId), [sites, siteId]);
  const siteSegment = useMemo(() => getSiteSegment(currentSite), [currentSite]);

  const [name, setName] = useState(() => getDefaultName(currentSite, type));
  const [subject, setSubject] = useState(() => getDefaultSubject(currentSite, type));
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
  const [showRecipientMenu, setShowRecipientMenu] = useState(false);
  const [batchSending, setBatchSending] = useState(false);

  useEffect(() => {
    if (sites.length > 0) {
      const exists = sites.some((site) => site.id === siteId);
      if (!exists) {
        setSiteId(sites[0].id);
      }
    }
  }, [sites, siteId]);

  useEffect(() => {
    setAudienceInterest(siteSegment);
    if (currentSite) {
      setSubject(getDefaultSubject(currentSite, type));
      setName(getDefaultName(currentSite, type));
    }
  }, [siteId, type, siteSegment, currentSite]);

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

  const extractValidEmails = (rawText: string): string[] => {
    if (!rawText) return [];
    // Strict email validation regex: excludes invalid binary/XML characters in Excel files
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = rawText.match(emailRegex) ?? [];
    return Array.from(new Set(matches.map((e) => e.toLowerCase().trim())));
  };

  const addCustomEmail = (emailStr: string) => {
    const valid = extractValidEmails(emailStr);
    if (valid.length > 0) {
      setCustomEmails((prev) => {
        const next = [...prev];
        for (const email of valid) {
          if (!next.includes(email)) {
            next.push(email);
          }
        }
        return next;
      });
    }
    setRecipientInput("");
  };

  const removeCustomEmail = (email: string) => {
    setCustomEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let found: string[] = [];
      const name = file.name.toLowerCase();
      const isExcel = /\.(xlsx|xls|ods)$/i.test(name);

      if (isExcel) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const allTextParts: string[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (sheet) {
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            allTextParts.push(JSON.stringify(rawData));
          }
        }
        found = extractValidEmails(allTextParts.join(" "));
      } else {
        const text = await file.text();
        found = extractValidEmails(text);
      }

      if (found.length > 0) {
        setCustomEmails((prev) => Array.from(new Set([...prev, ...found])));
        setError("");
      } else {
        setError(
          "No se encontraron correos válidos en el archivo subido. Asegúrate de incluir emails con formato usuario@dominio.com.",
        );
      }
    } catch (err) {
      console.error("Error al procesar el archivo:", err);
      setError(
        "No se pudo leer el archivo subido. Asegúrate de que sea un archivo de Excel (.xlsx) o CSV válido.",
      );
    } finally {
      e.target.value = "";
    }
  };

  const audienceCount = useMemo(
    () =>
      customEmails.length === 0
        ? contacts.filter((contact) => contact.status === "active" && contact.siteIds.includes(siteId) && contact.interests.includes(audienceInterest)).length
        : customEmails.length,
    [contacts, siteId, audienceInterest, customEmails],
  );

  const suggestedContacts = useMemo(() => {
    const term = recipientInput.trim().toLowerCase();
    if (!term) return [];
    return contacts
      .filter((c) => {
        if (c.status !== "active") return false;
        if (customEmails.includes(c.email)) return false;
        const fullText = `${c.firstName ?? ""} ${c.lastName ?? ""} ${c.email} ${c.company ?? ""}`.toLowerCase();
        return fullText.includes(term);
      })
      .slice(0, 6);
  }, [contacts, recipientInput, customEmails]);

  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    setVisibleCount(20);
  }, [contentQuery, type, siteId]);

  const matchingAvailable = useMemo(() => {
    const query = contentQuery.trim().toLocaleLowerCase("es-PE");
    if (!query) return available;
    return available.filter((item) => {
      const detail = "location" in item ? item.location : item.excerpt;
      return `${item.title} ${detail}`.toLocaleLowerCase("es-PE").includes(query);
    });
  }, [available, contentQuery]);

  const filteredAvailable = useMemo(() => {
    return matchingAvailable.slice(0, visibleCount);
  }, [matchingAvailable, visibleCount]);

  const previewItem = available.find((item) => item.id === previewId);
  const composerRef = useDialogA11y<HTMLElement>(open && !previewItem, closeComposer);
  const previewRef = useDialogA11y<HTMLElement>(Boolean(previewItem), () => setPreviewId(null));

  function changeType(next: AutomationType) {
    setType(next);
    setSelected([]);
    if (currentSite) {
      setSubject(getDefaultSubject(currentSite, next));
      setName(getDefaultName(currentSite, next));
    }
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
    if (step === 2 && !selected.length) {
      setStepMessage("Selecciona al menos un contenido para la campaña.");
      return;
    }
    if (step === 3 && (!name.trim() || !subject.trim())) {
      setStepMessage("Completa el nombre interno y el asunto del correo.");
      return;
    }
    setAttemptedStep(null);
    setStep(step + 1);
  }

  async function create() {
    if (!name.trim() || !subject.trim()) {
      setStepMessage("Completa el nombre interno y el asunto del correo.");
      return;
    }
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
    <div
      className="campaign-composer-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && closeComposer()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        backgroundColor: "rgba(248, 250, 252, 0.98)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
      }}
    >
      <section ref={composerRef} className={`card campaign-composer ${closing ? "is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="campaign-composer-title" tabIndex={-1}>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls,.csv,.tsv,.ods,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style={{ display: "none" }} />
      
      <header className="campaign-composer-head">
        <div>
          <span className="eyebrow">Nuevo borrador</span>
          <h2 id="campaign-composer-title">
            {step === 1 ? "Plantilla" : step === 2 ? "Seleccionar contenido" : "Audiencia e Información"}
          </h2>
          <p>Paso {step} de 3</p>
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
        {["Plantilla", "Contenido", "Audiencia"].map((label, index) => {
          const isActiveStep = step === index + 1;
          const isCompleteStep = step > index + 1;
          return (
            <button
              key={label}
              type="button"
              className={isActiveStep ? "active" : isCompleteStep ? "complete" : ""}
              style={isActiveStep ? { color: "#182230", borderBottom: "2px solid #182230", fontWeight: 600 } : undefined}
              onClick={() => index + 1 < step && setStep(index + 1)}
            >
              <span
                style={
                  isActiveStep || isCompleteStep
                    ? { background: "#182230", color: "#ffffff", fontWeight: 700 }
                    : { background: "#f1f5f9", color: "#64748b" }
                }
              >
                {isCompleteStep ? <Check size={12} /> : index + 1}
              </span>
              <span className="campaign-step-label-full">{label}</span>
              <span className="campaign-step-label-mobile">{index === 2 ? "Audiencia" : label}</span>
            </button>
          );
        })}
      </nav>

      {/* STEP 1: PLANTILLA */}
      {step === 1 && (
        <div className="campaign-form-grid campaign-step-panel" key="campaign-step-1">
          <fieldset className="campaign-template-field" style={{ gridColumn: "1 / -1" }}>
            <legend>Plantilla</legend>
            <div className="campaign-template-options">
              {options.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={type === item.value}
                  className={`campaign-template-option ${type === item.value ? "active" : ""}`}
                  style={
                    type === item.value
                      ? { borderColor: "#4f46e5", backgroundColor: "#f5f3ff", boxShadow: "0 0 0 1px #4f46e5" }
                      : undefined
                  }
                  onClick={() => changeType(item.value)}
                >
                  <span className={`campaign-template-mini ${item.value}`} aria-hidden="true">
                    <i style={{ background: "#4f46e5" }} />
                    <b style={{ background: "#e0e7ff" }} />
                    <b style={{ background: "#e0e7ff" }} />
                    <em style={{ background: "#e0e7ff" }} />
                  </span>
                  <span><strong>{item.label}</strong><small>{item.description}</small></span>
                  <span
                    className="campaign-template-check"
                    style={
                      type === item.value
                        ? { background: "#4338ca", borderColor: "#4338ca", color: "#ffffff" }
                        : { background: "transparent", borderColor: "#ccd4da", color: "transparent" }
                    }
                  >
                    {type === item.value && <Check size={13} />}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {/* STEP 2: CONTENIDO */}
      {step === 2 && (
        <div className="campaign-step-panel campaign-content-step" key="campaign-step-2" style={{ gap: "10px" }}>
          <div className="campaign-content-head" style={{ marginBottom: 0, paddingBottom: 0 }}>
            <div><strong>Contenido disponible</strong><span>{selected.length}/{config.limit} seleccionados</span></div>
          </div>
          <label className="campaign-content-search" style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px" }}>
            <Search size={15} style={{ color: "#64748b" }} />
            <input
              className="composer-search-input search-input"
              value={contentQuery}
              onChange={(event) => setContentQuery(event.target.value)}
              placeholder="Buscar por título o ubicación"
              style={{
                border: "none",
                borderStyle: "none",
                borderWidth: 0,
                borderColor: "transparent",
                borderRadius: 0,
                background: "transparent",
                backgroundColor: "transparent",
                boxShadow: "none",
                outline: "none",
                padding: 0,
                margin: 0,
                minHeight: 0,
                height: "auto",
                width: "100%",
                color: "inherit",
              }}
            />
          </label>
          <div
            className="campaign-picker"
            aria-label="Contenido disponible"
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
                if (visibleCount < matchingAvailable.length) {
                  setVisibleCount((prev) => prev + 20);
                }
              }
            }}
          >
            {filteredAvailable.map((item) => {
              const active = selected.includes(item.id);
              const detail = "location" in item ? item.location : item.excerpt;
              return (
                <article
                  key={item.id}
                  className={`campaign-pick ${active ? "active" : ""}`}
                  style={{
                    backgroundColor: "#ffffff",
                    borderColor: active ? "#cbd5e1" : "#e2e8f0",
                    borderWidth: "1px",
                    borderStyle: "solid",
                  }}
                >
                  <button
                    className="campaign-pick-image"
                    type="button"
                    onClick={() => setPreviewId(item.id)}
                    aria-label={`Ver vista previa de ${item.title}`}
                  >
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <FileText size={24} />}
                    <span><Eye size={10} /> Ver</span>
                  </button>
                  <button className="campaign-pick-body" type="button" onClick={() => toggle(item.id)}>
                    <span><strong>{item.title}</strong><em>{detail}</em></span>
                    <span
                      className="campaign-check"
                      style={
                        active
                          ? { background: "#4338ca", borderColor: "#4338ca", color: "#ffffff" }
                          : { background: "#ffffff", borderColor: "#cbd4da", color: "transparent" }
                      }
                    >
                      <Check size={12} />
                    </span>
                  </button>
                </article>
              );
            })}
            {!matchingAvailable.length && (
              <p className="campaign-picker-empty">No se encontraron elementos para publicar.</p>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: AUDIENCIA E INFORMACIÓN */}
      {step === 3 && (
        <div className="campaign-step-panel" key="campaign-step-3" style={{ padding: "16px 20px", display: "grid", gap: "16px" }}>
          <div className="card campaign-review-card" style={{ padding: "16px", display: "grid", gap: "14px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
            <div className="campaign-review-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1e293b", fontWeight: 600, fontSize: "13px" }}>
                <Mail size={15} style={{ color: "#4f46e5" }} />
                <span>Configuración de correo y destinatarios</span>
              </div>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>
                {selected.length} {selected.length === 1 ? "elemento seleccionado" : "elementos seleccionados"}
              </span>
            </div>

            {/* Para / Recipients Row */}
            <div style={{ display: "grid", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label htmlFor="campaign-composer-to-field" style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
                  Para:
                </label>
                <span style={{ fontSize: "11px", color: "#4338ca", fontWeight: 600 }}>
                  {contactsReady ? `${audienceCount.toLocaleString("es-PE")} destinatario(s)` : "Cargando..."}
                </span>
              </div>
              
              <div className="email-recipients-input-wrapper" style={{
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "6px 10px",
                minHeight: "44px",
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                alignItems: "center",
                background: "#ffffff",
                cursor: "text",
                position: "relative",
              }}>
                {customEmails.map((email) => (
                  <span key={email} style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "#eef2ff",
                    border: "1px solid #c7d2fe",
                    borderRadius: "6px",
                    padding: "3px 8px",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#3730a3",
                  }}>
                    {email}
                    <button type="button" onClick={() => removeCustomEmail(email)} style={{
                      border: "none", background: "none", padding: 0, cursor: "pointer", display: "inline-flex", color: "#4338ca",
                    }} aria-label={`Eliminar ${email}`}>
                      <X size={12} />
                    </button>
                  </span>
                ))}

                <input
                  id="campaign-composer-to-field"
                  type="text"
                  className="composer-search-input search-input"
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
                    borderStyle: "none",
                    borderWidth: 0,
                    borderColor: "transparent",
                    borderRadius: 0,
                    background: "transparent",
                    backgroundColor: "transparent",
                    boxShadow: "none",
                    outline: "none",
                    flex: 1,
                    minWidth: "200px",
                    fontSize: "13px",
                    color: "#1e293b",
                    padding: "2px 0",
                    margin: 0,
                    minHeight: 0,
                    height: "auto",
                  }}
                />

                {suggestedContacts.length > 0 && (
                  <div
                    className="email-suggestions-dropdown"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                      zIndex: 105,
                      maxHeight: "220px",
                      overflowY: "auto",
                      padding: "4px",
                    }}
                  >
                    <div style={{ padding: "4px 8px", fontSize: "11px", fontWeight: 600, color: "#64748b", borderBottom: "1px solid #f1f5f9", marginBottom: "2px" }}>
                      Sugerencias de la base de datos ({suggestedContacts.length})
                    </div>
                    {suggestedContacts.map((c) => {
                      const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            addCustomEmail(c.email);
                            setRecipientInput("");
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            border: "none",
                            background: "transparent",
                            borderRadius: "6px",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <div style={{ display: "grid" }}>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>
                              {name || c.email.split("@")[0]}
                            </span>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>{c.email}</span>
                          </div>
                          {c.company && (
                            <span style={{ fontSize: "11px", color: "#64748b", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                              {c.company}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Recipient '+' Button with Dropdown Options */}
                <div style={{ position: "relative", marginLeft: "auto", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setShowRecipientMenu((v) => !v)}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      width: "28px",
                      height: "28px",
                      display: "grid",
                      placeItems: "center",
                      background: "#f8fafc",
                      color: "#475569",
                      cursor: "pointer",
                    }}
                    aria-label="Opciones de destinatarios"
                    title="Añadir opciones de destinatarios"
                  >
                    <Plus size={15} />
                  </button>

                  {showRecipientMenu && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 0,
                      width: "250px",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "10px",
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.12)",
                      zIndex: 100,
                      padding: "6px",
                      display: "grid",
                      gap: "4px",
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          const activeEmails = contacts
                            .filter((c) => c.status === "active" && c.siteIds.includes(siteId))
                            .map((c) => c.email);
                          setCustomEmails(Array.from(new Set(activeEmails)));
                          setShowRecipientMenu(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          border: "none",
                          borderRadius: "6px",
                          background: "transparent",
                          color: "#334155",
                          fontSize: "12px",
                          fontWeight: 500,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <UsersRound size={14} style={{ color: "#4f46e5" }} />
                        <span>Cargar todos los contactos de la marca</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowRecipientMenu(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          border: "none",
                          borderRadius: "6px",
                          background: "transparent",
                          color: "#334155",
                          fontSize: "12px",
                          fontWeight: 500,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <FileText size={14} style={{ color: "#4f46e5" }} />
                        <span>Importar lista CSV / Excel</span>
                      </button>

                      {customEmails.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomEmails([]);
                            setShowRecipientMenu(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 10px",
                            border: "none",
                            borderRadius: "6px",
                            background: "transparent",
                            color: "#dc2626",
                            fontSize: "12px",
                            fontWeight: 500,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <X size={14} />
                          <span>Vaciar selección de correos</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <hr style={{ border: 0, borderTop: "1px solid #f1f5f9", margin: "2px 0" }} />

            {/* Nombre interno */}
            <div style={{ display: "grid", gap: "6px" }}>
              <label className="campaign-field-label" style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>Nombre interno</span>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 400 }}>(Nombre de referencia para tu equipo)</span>
              </label>
              <input
                className="composer-search-input search-input"
                value={name}
                onChange={(event) => { setName(event.target.value); setStepMessage(""); }}
                placeholder="Ej. Nuevas naves industriales de la semana..."
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "9px 12px",
                  fontSize: "13px",
                  color: "#1e293b",
                  width: "100%",
                  outline: "none",
                }}
              />
            </div>

            {/* Asunto */}
            <div style={{ display: "grid", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
                Asunto del correo
              </label>
              <input
                className="composer-search-input search-input"
                value={subject}
                onChange={(event) => { setSubject(event.target.value); setStepMessage(""); }}
                placeholder="Asunto visible para los destinatarios..."
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "9px 12px",
                  fontSize: "13px",
                  color: "#1e293b",
                  width: "100%",
                  outline: "none",
                }}
              />
            </div>

            {/* Introducción */}
            <div style={{ display: "grid", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
                Introducción
              </label>
              <textarea
                rows={3}
                value={introduction}
                onChange={(event) => setIntroduction(event.target.value)}
                placeholder="Mensaje o bienvenida que se mostrará al inicio del correo..."
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "9px 12px",
                  fontSize: "13px",
                  color: "#1e293b",
                  width: "100%",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Daily Batch Pacing Option if audience > 100 */}
            {audienceCount > 100 && (
              <div style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                padding: "12px",
                display: "grid",
                gap: "8px",
                marginTop: "4px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534", fontWeight: 600, fontSize: "12px" }}>
                    <Zap size={15} style={{ color: "#16a34a" }} />
                    <span>Programación en lotes diarios (Límite 100/día)</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "#15803d", fontWeight: 600 }}>
                    {Math.ceil(audienceCount / 100)} días estimados
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "11px", color: "#166534", lineHeight: 1.4 }}>
                  Se detectaron {audienceCount.toLocaleString("es-PE")} destinatarios. Para respetar el límite diario de 100 envíos, puedes programar la distribución automática.
                </p>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", color: "#14532d", fontWeight: 600, marginTop: "2px" }}>
                  <input
                    type="checkbox"
                    checked={batchSending}
                    onChange={(e) => setBatchSending(e.target.checked)}
                    style={{ borderRadius: "4px", accentColor: "#16a34a" }}
                  />
                  <span>Activar envío en lotes de 100 correos/día ({Math.ceil(audienceCount / 100)} lotes automáticos)</span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Single Item preview dialog */}
      {previewItem && (
        <div className="campaign-preview-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPreviewId(null)}>
          <section ref={previewRef} className="campaign-item-preview" role="dialog" aria-modal="true" aria-label={`Vista previa de ${previewItem.title}`} tabIndex={-1}>
            <header><div><span>Vista previa</span><strong>{previewItem.title}</strong></div><button type="button" className="icon-btn" onClick={() => setPreviewId(null)} aria-label="Cerrar vista previa"><X size={18} /></button></header>
            <div className="campaign-item-preview-media">{previewItem.imageUrl ? <img src={previewItem.imageUrl} alt={previewItem.title} /> : <FileText size={32} />}</div>
            <div className="campaign-item-preview-copy"><p>{"location" in previewItem ? previewItem.description : previewItem.excerpt}</p><a href={previewItem.publicUrl} target="_blank" rel="noreferrer">Abrir publicación</a></div>
          </section>
        </div>
      )}

      {error && (
        <p className="notice error" role="status">
          {error}
        </p>
      )}

      {stepMessage && <p className="campaign-step-feedback" role="alert">{stepMessage}</p>}

      <footer className="campaign-composer-foot">
        <div>
          {step > 1 && (
            <button className="btn subtle" type="button" onClick={() => { setStepMessage(""); setAttemptedStep(null); setStep(step - 1); }}>
              <ChevronLeft size={15} />Atrás
            </button>
          )}
        </div>
        {step < 3 ? (
          <button className="btn primary" type="button" onClick={advance}>
            Continuar <ChevronRight size={15} />
          </button>
        ) : (
          <button
            className="btn primary"
            type="button"
            onClick={() => void create()}
            disabled={saving || !selected.length || !name.trim() || !subject.trim() || !contactsReady}
          >
            {saving ? (
              <Loader2 className="spin" size={15} />
            ) : (
              <Check size={15} />
            )}
            {saving ? "Guardando borrador…" : "Crear borrador"}
          </button>
        )}
      </footer>
    </section>
  </div>
  );
}
