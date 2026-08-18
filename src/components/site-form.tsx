"use client";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Site } from "@/src/domain/types";

export function SiteForm({ site }: { site: Site }) {
  const [state, setState] = useState(site);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const change = (key: keyof Site, value: string) =>
    { setState((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: "" })); setMessage(""); };
  async function save() {
    const nextErrors: Record<string, string> = {};
    if (!state.name.trim()) nextErrors.name = "Escribe el nombre visible de la marca.";
    if (!/^(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/.*)?$/i.test(state.domain.trim())) nextErrors.domain = "Escribe un dominio válido.";
    if (!state.senderName.trim()) nextErrors.senderName = "Indica quién aparecerá como remitente.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.senderEmail.trim())) nextErrors.senderEmail = "Revisa el formato del correo.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setMessage("Revisa los campos marcados antes de guardar."); return; }
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/sites/${site.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(state),
      });
      setMessage(response.ok ? "Cambios guardados correctamente." : "No se pudieron guardar los cambios.");
    } finally { setSaving(false); }
  }
  return (
    <div className={`card form-card site-form-refined ${saving ? "is-processing" : ""}`} aria-busy={saving}>
      <div className="section-head">
        <div><h2 className="section-title">Identidad y remitente</h2><p>Estos datos son visibles para las personas que reciben tus correos.</p></div>
        <button className="btn primary" onClick={save} disabled={saving} aria-busy={saving}>
          {saving ? <Loader2 className="spin" size={15} /> : message.startsWith("Cambios") ? <Check size={15} /> : null}{saving ? "Guardando…" : message.startsWith("Cambios") ? "Guardado" : "Guardar cambios"}
        </button>
      </div>
      <div className="form-grid">
        <Field
          id="site-name"
          label="Nombre"
          value={state.name}
          error={errors.name}
          onChange={(v) => change("name", v)}
        />
        <Field
          id="site-description"
          label="Descripción"
          value={state.description}
          onChange={(v) => change("description", v)}
          full
        />
        <Field
          id="site-business"
          label="Tipo de negocio"
          value={state.businessType}
          onChange={(v) => change("businessType", v)}
        />
        <Field
          id="site-domain"
          label="Dominio"
          value={state.domain}
          error={errors.domain}
          onChange={(v) => change("domain", v)}
        />
        <Field
          id="site-sender"
          label="Nombre del remitente"
          value={state.senderName}
          error={errors.senderName}
          onChange={(v) => change("senderName", v)}
        />
        <Field
          id="site-email"
          label="Email del remitente"
          type="email"
          value={state.senderEmail}
          error={errors.senderEmail}
          onChange={(v) => change("senderEmail", v)}
        />
        <Field
          id="site-primary"
          label="Color principal"
          type="color"
          value={state.primaryColor}
          onChange={(v) => change("primaryColor", v)}
        />
        <Field
          id="site-secondary"
          label="Color secundario"
          type="color"
          value={state.secondaryColor}
          onChange={(v) => change("secondaryColor", v)}
        />
      </div>
      <details className="site-form-advanced"><summary><ChevronDown size={14}/><span><strong>Configuración avanzada</strong><small>Identificador, zona horaria y fuente editorial</small></span></summary><div className="form-grid"><Field id="site-slug" label="Identificador interno" value={state.slug} onChange={(v) => change("slug", v)}/><div className="field"><label>Zona horaria</label><div className="site-static-field">{state.timezone || "America/Lima"}</div></div><Field id="site-wordpress" label="URL de WordPress" value={state.wordpressUrl} onChange={(v) => change("wordpressUrl", v)} full/></div></details>
      {message && (
        <p
          className={
            message.startsWith("Cambios") ? "notice success" : "notice error"
          }
          role={message.startsWith("Cambios") ? "status" : "alert"} aria-live="polite"
        >
          {message}
        </p>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  full = false,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  full?: boolean;
  error?: string;
}) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        required
      />
      {error && <small className="field-error" id={`${id}-error`}>{error}</small>}
    </div>
  );
}
