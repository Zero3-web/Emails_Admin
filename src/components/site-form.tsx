"use client";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Site } from "@/src/domain/types";

export function SiteForm({ site }: { site: Site }) {
  const [state, setState] = useState(site);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const change = (key: keyof Site, value: string) =>
    setState((current) => ({ ...current, [key]: value }));
  async function save() {
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
    <div className={`card form-card ${saving ? "is-processing" : ""}`} aria-busy={saving}>
      <div className="section-head">
        <h2 className="section-title">Información general</h2>
        <button className="btn primary" onClick={save} disabled={saving} aria-busy={saving}>
          {saving ? <Loader2 className="spin" size={15} /> : message.startsWith("Cambios") ? <Check size={15} /> : null}{saving ? "Guardando…" : message.startsWith("Cambios") ? "Guardado" : "Guardar cambios"}
        </button>
      </div>
      <div className="form-grid">
        <Field
          id="site-name"
          label="Nombre"
          value={state.name}
          onChange={(v) => change("name", v)}
        />
        <Field
          id="site-slug"
          label="Slug"
          value={state.slug}
          onChange={(v) => change("slug", v)}
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
        <div className="field">
          <label htmlFor="site-timezone">Timezone</label>
          <select
            id="site-timezone"
            value={state.timezone}
            onChange={(e) => change("timezone", e.target.value)}
          >
            <option>America/Lima</option>
          </select>
        </div>
        <Field
          id="site-domain"
          label="Dominio"
          value={state.domain}
          onChange={(v) => change("domain", v)}
        />
        <Field
          id="site-wordpress"
          label="WordPress URL"
          value={state.wordpressUrl}
          onChange={(v) => change("wordpressUrl", v)}
        />
        <Field
          id="site-sender"
          label="Nombre del remitente"
          value={state.senderName}
          onChange={(v) => change("senderName", v)}
        />
        <Field
          id="site-email"
          label="Email del remitente"
          type="email"
          value={state.senderEmail}
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
      {message && (
        <p
          className={
            message.startsWith("Cambios") ? "notice success" : "notice error"
          }
          role="status" aria-live="polite"
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  full?: boolean;
}) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </div>
  );
}
