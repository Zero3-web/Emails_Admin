"use client";

import { Check, FileSpreadsheet, Loader2, Upload, UsersRound, X } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDialogA11y } from "@/src/hooks/use-dialog-a11y";
import { parseContactFile, type ContactCsvRow } from "@/src/lib/contacts/csv";
import type { ContactInterest } from "@/src/domain/types";

export function PrepareAudienceButton({ campaignId, siteId, interest, label = "Preparar audiencia" }: { campaignId: string; siteId: string; interest: ContactInterest; label?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ContactCsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState("Formulario web de la marca");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useDialogA11y<HTMLDivElement>(open, () => !saving && setOpen(false));

  async function choose(file?: File) {
    if (!file) return;
    setError("");
    try {
      const parsed = await parseContactFile(file);
      if (parsed.length > 5000) throw new Error("El archivo supera el máximo de 5,000 filas.");
      setRows(parsed);
      setFileName(file.name);
    } catch (cause) {
      setRows([]);
      setError(cause instanceof Error ? cause.message : "No se pudo leer el archivo.");
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteId, interest, consentSource: source, consentConfirmed: confirmed, rows }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "No se pudo importar la audiencia.");
      const refreshResponse = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "refresh_audience" }),
      });
      const refreshResult = await refreshResponse.json();
      if (!refreshResponse.ok || !refreshResult.ok) throw new Error(refreshResult.error ?? "Los contactos se importaron, pero no se pudo actualizar el borrador.");
      setOpen(false);
      setRows([]);
      setFileName("");
      setSource("");
      setConfirmed(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo importar la audiencia.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <button type="button" className="campaign-audience-trigger" onClick={() => setOpen(true)}>{label}</button>
    {open && <div className="audience-quick-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && setOpen(false)}>
      <div ref={dialogRef} className="audience-quick-dialog" role="dialog" aria-modal="true" aria-labelledby="audience-quick-title" tabIndex={-1}>
        <header><span><UsersRound size={18}/></span><div><small>Campaña</small><h2 id="audience-quick-title">Preparar audiencia</h2><p>Importa contactos autorizados sin salir de la campaña.</p></div><button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} disabled={saving}><X size={18}/></button></header>
        <div className="audience-quick-body">
          <input ref={inputRef} hidden type="file" accept=".xlsx,.xls,.csv,.tsv,.ods,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => void choose(event.target.files?.[0])}/>
          <button type="button" className="audience-quick-file" onClick={() => inputRef.current?.click()}>
            <FileSpreadsheet size={22}/><span><strong>{fileName || "Selecciona un archivo Excel o CSV"}</strong><small>{rows.length ? `${rows.length.toLocaleString("es-PE")} contactos detectados` : "Correo obligatorio · máximo 5,000 filas"}</small></span><em>{rows.length ? "Cambiar" : "Elegir archivo"}</em>
          </button>
          <label className="field"><span>Origen del consentimiento</span><input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Ej. formulario web de la marca"/></label>
          <label className={`audience-quick-consent ${confirmed ? "checked" : ""}`}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/><span>{confirmed && <Check size={12}/>}</span><div><strong>Confirmo que tengo autorización</strong><small>Estos contactos aceptaron recibir comunicaciones.</small></div></label>
          {error && <p className="notice error" role="alert">{error}</p>}
        </div>
        <footer><button type="button" className="btn" onClick={() => setOpen(false)} disabled={saving}>Cancelar</button><button type="button" className="btn primary" onClick={() => void save()} disabled={saving || !rows.length || !source.trim() || !confirmed}>{saving ? <Loader2 className="spin" size={15}/> : <Upload size={15}/>}Importar audiencia</button></footer>
      </div>
    </div>}
  </>;
}

