"use client";

import { CalendarClock, Check, CheckCircle2, Clock3, FileCheck2, Loader2, Mail, MoreVertical, Pencil, Play, Plus, ShieldCheck, Sparkles, Trash2, UploadCloud, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import type { Automation, AutomationType, Contact, Site } from "@/src/domain/types";
import { useDialogA11y } from "@/src/hooks/use-dialog-a11y";

const automationTypes: Array<{ value: AutomationType; label: string; detail: string }> = [
  { value: "weekly_new_properties", label: "Nuevas propiedades", detail: "Selecciona incorporaciones recientes y prepara un borrador." },
  { value: "monthly_properties", label: "Resumen de propiedades", detail: "Reúne una selección amplia del inventario disponible." },
  { value: "monthly_blog", label: "Novedades del blog", detail: "Agrupa los artículos publicados durante el periodo." },
];
const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const emptyDraft = (siteId: string) => ({ siteId, type: "weekly_new_properties" as AutomationType, frequency: "weekly" as Automation["frequency"], day: 1, sendTime: "09:00", requiresApproval: false });

const formatTime12h = (timeStr: string) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

export function AutomationsView({ initial, sites, contacts = [] }: { initial: Automation[]; sites: Site[]; contacts?: Contact[] }) {
  const [items, setItems] = useState(initial);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [draft, setDraft] = useState(emptyDraft(sites[0]?.id ?? ""));
  const [audienceSource, setAudienceSource] = useState<"brand" | "custom">("brand");
  const [customEmails, setCustomEmails] = useState<string[]>([]);
  const [customEmailInput, setCustomEmailInput] = useState("");
  const [customUploadError, setCustomUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalClosing, setModalClosing] = useState(false);
  const modalRef = useDialogA11y<HTMLElement>(Boolean(editingId), closeAutomation);
  const deleteModalRef = useDialogA11y<HTMLElement>(Boolean(confirmDelete), () => setConfirmDelete(null));
  const existingTypes = useMemo(() => new Set(items.filter((item) => item.siteId === draft.siteId && item.id !== editingId).map((item) => item.type)), [items, draft.siteId, editingId]);
  const enabled = items.filter((item) => item.isEnabled).length;
  const protectedCount = items.filter((item) => item.requiresApproval).length;

  useEffect(() => { if (!message) return; const timeout = window.setTimeout(() => setMessage(null), 3600); return () => window.clearTimeout(timeout); }, [message]);

  const extractValidEmails = (rawText: string): string[] => {
    if (!rawText) return [];
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = rawText.match(emailRegex) ?? [];
    return Array.from(new Set(matches.map((e) => e.toLowerCase().trim())));
  };

  const addCustomEmails = (textOrEmail: string) => {
    const valid = extractValidEmails(textOrEmail);
    if (valid.length > 0) {
      setCustomEmails((prev) => Array.from(new Set([...prev, ...valid])));
      setCustomUploadError(null);
    }
    setCustomEmailInput("");
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
        setCustomUploadError(null);
      } else {
        setCustomUploadError("No se encontraron correos válidos en el archivo subido.");
      }
    } catch (err) {
      console.error("Error al procesar archivo:", err);
      setCustomUploadError("No se pudo leer el archivo. Sube un archivo Excel (.xlsx) o CSV válido.");
    } finally {
      e.target.value = "";
    }
  };

  const suggestedContacts = useMemo(() => {
    const term = customEmailInput.trim().toLowerCase();
    if (!term || !contacts?.length) return [];
    return contacts
      .filter((c) => {
        if (c.status !== "active") return false;
        if (customEmails.includes(c.email.toLowerCase())) return false;
        const fullText = `${c.firstName ?? ""} ${c.lastName ?? ""} ${c.email} ${c.company ?? ""}`.toLowerCase();
        return fullText.includes(term);
      })
      .slice(0, 5);
  }, [contacts, customEmailInput, customEmails]);

  async function update(id: string, patch: Partial<Automation>) {
    const current = items.find((item) => item.id === id); if (!current || saving) return false;
    const previous = items; setSaving(id); setItems((list) => list.map((item) => item.id === id ? { ...item, ...patch } : item));
    try {
      const response = await fetch(`/api/automations/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "No se pudo guardar.");
      setItems((list) => list.map((item) => item.id === id ? payload.automation : item)); setMessage({ text: "Cambios guardados." }); return true;
    } catch (error) { setItems(previous); setMessage({ text: error instanceof Error ? error.message : "No se pudo guardar.", error: true }); return false; }
    finally { setSaving(null); }
  }

  async function executeDelete(id: string) {
    if (saving) return;
    setSaving(id);
    try {
      const response = await fetch(`/api/automations/${id}`, { method: "DELETE" });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "No se pudo eliminar.");
      setItems((list) => list.filter((item) => item.id !== id));
      if (editingId === id) closeAutomation();
      setConfirmDelete(null);
      setMessage({ text: "Automatización eliminada." });
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : "No se pudo eliminar.", error: true }); }
    finally { setSaving(null); }
  }

  function promptDelete(item: { id: string; name: string }) {
    setConfirmDelete({ id: item.id, name: item.name });
  }

  const [runningId, setRunningId] = useState<string | null>(null);

  const executeManualRun = async (item: Automation) => {
    setRunningId(item.id);
    setMessage({ text: `Ejecutando "${item.name}" de prueba...` });
    try {
      const res = await fetch(`/api/automations/${item.id}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo ejecutar la prueba.");
      if (data.sent) {
        setMessage({ text: `¡Automatización ejecutada con éxito! Correo enviado a los destinatarios configurados.` });
      } else {
        setMessage({ text: `Borrador generado con éxito. Puedes revisarlo en la pestaña de Campañas.` });
      }
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Error al ejecutar la automatización.", error: true });
    } finally {
      setRunningId(null);
    }
  };

  async function saveDraft() {
    if (existingTypes.has(draft.type)) { setMessage({ text: "Esta marca ya tiene ese flujo configurado.", error: true }); return; }
    let finalCustomEmails = [...customEmails];
    if (audienceSource === "custom" && customEmailInput.trim()) {
      const typed = extractValidEmails(customEmailInput);
      if (typed.length > 0) {
        finalCustomEmails = Array.from(new Set([...finalCustomEmails, ...typed]));
        setCustomEmails(finalCustomEmails);
        setCustomEmailInput("");
      }
    }
    const payload = {
      ...draft,
      customRecipients: audienceSource === "custom" ? finalCustomEmails : [],
    };
    if (editingId && editingId !== "new") { const saved = await update(editingId, payload); if (saved) closeAutomation(); return; }
    setSaving("new");
    try {
      const response = await fetch("/api/automations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const resData = await response.json(); if (!response.ok) throw new Error(resData.error ?? "No se pudo crear.");
      setItems((list) => [...list, resData.automation]); closeAutomation(); setMessage({ text: "Automatización creada. Actívala cuando esté lista." });
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : "No se pudo crear.", error: true }); }
    finally { setSaving(null); }
  }

  function closeAutomation() {
    if (modalClosing || saving) return;
    setModalClosing(true);
    window.setTimeout(() => { setEditingId(null); setModalClosing(false); }, 150);
  }

  const openNew = () => {
    setDraft(emptyDraft(sites[0]?.id ?? ""));
    setAudienceSource("brand");
    setCustomEmails([]);
    setCustomEmailInput("");
    setCustomUploadError(null);
    setEditingId("new");
  };

  const openEdit = (item: Automation) => {
    setDraft({ siteId: item.siteId, type: item.type, frequency: item.frequency, day: item.day, sendTime: item.sendTime, requiresApproval: item.requiresApproval });
    if (item.customRecipients && item.customRecipients.length > 0) {
      setAudienceSource("custom");
      setCustomEmails(item.customRecipients);
    } else {
      setAudienceSource("brand");
      setCustomEmails([]);
    }
    setCustomEmailInput("");
    setCustomUploadError(null);
    setEditingId(item.id);
  };

  const schedule = (item: Automation) => item.frequency === "weekly" ? `${weekDays[Math.max(0, item.day - 1)] ?? "Lun"}, ${item.sendTime}` : `Día ${item.day} de cada mes, ${item.sendTime}`;

  return (
    <div className="automations-workspace refined">
      <section className="automation-overview" aria-label="Resumen de automatizaciones">
        <article><span className="automation-overview-icon positive"><CheckCircle2 size={16}/></span><div><strong>{enabled}</strong><small>flujos activos</small></div></article>
        <article><span className="automation-overview-icon"><CalendarClock size={16}/></span><div><strong>{items.length - enabled}</strong><small>pendientes de activar</small></div></article>
        <article><span className="automation-overview-icon positive"><ShieldCheck size={16}/></span><div><strong>{protectedCount}</strong><small>requieren aprobación</small></div></article>
        <button type="button" onClick={openNew}><Plus size={15}/><span><strong>Nueva automatización</strong><small>Crear un flujo programado</small></span></button>
      </section>

      {items.length ? (
        <section className="card automation-panel">
          <header>
            <div><h2>Flujos programados</h2><p>Cada ejecución prepara contenido y respeta la aprobación configurada.</p></div>
            <span>{enabled}/{items.length} activos</span>
          </header>
          <div className="automation-brand-list">
            {sites.map((site) => {
              const siteItems = items.filter((item) => item.siteId === site.id);
              if (!siteItems.length) return null;
              return (
                <section key={site.id}>
                  <header>
                    <span style={{background:"#ccff00", color:"#000000", fontWeight:800}}>{site.name.slice(0,2).toUpperCase()}</span>
                    <div><h3>{site.name}</h3><p>{site.domain}</p></div>
                  </header>
                  <div>
                    {siteItems.map((item) => (
                      <article className={item.isEnabled ? "enabled" : ""} key={item.id}>
                        <span className="automation-flow-icon"><Sparkles size={16}/></span>
                        <div className="automation-flow-main">
                          <strong>{item.name}</strong>
                          <small>{item.nextRunAt === "Sin programar" ? "Se programará al activarla" : `Próxima ejecución: ${item.nextRunAt}`}</small>
                        </div>
                        <div className="automation-flow-fact">
                          <Clock3 size={13}/>
                          <span><small>Programación</small><strong>{schedule(item)}</strong></span>
                        </div>
                        <div className="automation-flow-fact">
                          <FileCheck2 size={13}/>
                          <span><small>Revisión</small><strong>{item.requiresApproval ? "Aprobación manual" : "Envío automático"}</strong></span>
                        </div>
                        <div className="automation-state refined">
                          <span>{item.isEnabled ? "Activa" : "Pausada"}</span>
                          <button
                            aria-label={`${item.isEnabled ? "Desactivar" : "Activar"} ${item.name}`}
                            aria-pressed={item.isEnabled}
                            className={`toggle ${item.isEnabled ? "on" : ""}`}
                            disabled={saving === item.id}
                            onClick={() => void update(item.id, { isEnabled: !item.isEnabled })}
                          >
                            {saving === item.id && <Loader2 className="spin" size={12}/>}
                          </button>
                        </div>
                        <div style={{ position: "relative" }}>
                          <button
                            type="button"
                            className="btn subtle"
                            onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                            style={{ padding: "6px", borderRadius: "8px", color: "var(--am-ink, #475569)" }}
                            aria-label="Opciones de automatización"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openMenuId === item.id && (
                            <>
                              <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpenMenuId(null)} />
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: "100%",
                                  marginTop: "4px",
                                  background: "var(--am-surface, #ffffff)",
                                  border: "1px solid var(--am-border, #e2e8f0)",
                                  borderRadius: "10px",
                                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                                  padding: "4px",
                                  zIndex: 50,
                                  minWidth: "160px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "2px",
                                }}
                              >
                                <button
                                  type="button"
                                  className="btn subtle"
                                  onClick={() => { setOpenMenuId(null); openEdit(item); }}
                                  style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "flex-start", padding: "8px 12px", fontSize: "13px" }}
                                >
                                  <Pencil size={14} /> Editar
                                </button>
                                <button
                                  type="button"
                                  className="btn subtle"
                                  onClick={() => { setOpenMenuId(null); void executeManualRun(item); }}
                                  disabled={runningId === item.id}
                                  style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "flex-start", padding: "8px 12px", fontSize: "13px", color: "#4f46e5", fontWeight: 600 }}
                                >
                                  {runningId === item.id ? <Loader2 size={14} className="spin" /> : <Play size={14} />} Probar / Lanzar ahora
                                </button>
                                <button
                                  type="button"
                                  className="btn subtle"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    const customList = item.customRecipients;
                                    const hasCustom = customList && customList.length > 0;
                                    setMessage({
                                      text: hasCustom
                                        ? `Audiencia personalizada para ${item.name}: ${customList.length} destinatario(s) (${customList.slice(0, 3).join(", ")}${customList.length > 3 ? "..." : ""}).`
                                        : `Audiencia activa para ${site.name}: Contactos importados para ${site.name}.`
                                    });
                                  }}
                                  style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "flex-start", padding: "8px 12px", fontSize: "13px" }}
                                >
                                  <UsersRound size={14} /> Ver audiencia
                                </button>
                                <button
                                  type="button"
                                  className="btn subtle"
                                  onClick={() => { setOpenMenuId(null); promptDelete(item); }}
                                  disabled={saving === item.id || runningId === item.id}
                                  style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "flex-start", padding: "8px 12px", fontSize: "13px", color: "#ef4444" }}
                                >
                                  <Trash2 size={14} /> Eliminar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="card automation-empty-refined">
          <span><CalendarClock size={22}/></span>
          <div>
            <small>Empieza con un flujo seguro</small>
            <h2>Automatiza la preparación, conserva el control</h2>
            <p>El sistema puede reunir el contenido y crear el borrador en la fecha indicada. La aprobación manual permanece activa antes de cualquier envío.</p>
            <ul>
              <li><Check size={12}/>Contenido actualizado</li>
              <li><Check size={12}/>Horario definido</li>
              <li><Check size={12}/>Revisión antes de enviar</li>
            </ul>
          </div>
        </section>
      )}

      {editingId && (
        <div className={`automation-modal-backdrop ${modalClosing ? "is-closing" : ""}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAutomation(); }}>
          <section ref={modalRef} className={`automation-modal ${modalClosing ? "is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="automation-modal-title" tabIndex={-1}>
            <header>
              <div><span>{editingId === "new" ? "Nuevo flujo" : "Editar flujo"}</span><h2 id="automation-modal-title">Configura la automatización</h2><p>El contenido se preparará con esta frecuencia y horario.</p></div>
              <button type="button" aria-label="Cerrar" onClick={closeAutomation}><X size={17}/></button>
            </header>
            <div className="automation-modal-body">
              <fieldset><legend>Marca</legend><div className="automation-brand-options">{sites.map((site) => <button key={site.id} type="button" className={draft.siteId === site.id ? "active" : ""} disabled={editingId !== "new"} onClick={() => setDraft({...draft,siteId:site.id})}><i style={{background:"#ccff00", color:"#000000", fontWeight:800}}>{site.name.slice(0,2).toUpperCase()}</i><span><strong>{site.name}</strong><small>{site.domain}</small></span>{draft.siteId === site.id && <Check size={13}/>}</button>)}</div></fieldset>
              
              <div style={{ display: "grid", gap: "10px" }}>
                <div className="automation-audience-info" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <strong>
                        {audienceSource === "brand"
                          ? `Audiencia de ${sites.find((site) => site.id === draft.siteId)?.name ?? "la marca"}`
                          : "Audiencia personalizada"}
                      </strong>
                      <small style={{ display: "block" }}>
                        {audienceSource === "brand"
                          ? "Usará únicamente contactos activos importados para esta marca. Las bajas, rebotes y quejas se excluyen automáticamente."
                          : "Define los correos específicos que recibirán el contenido de esta automatización."}
                      </small>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "4px", flexShrink: 0, background: "var(--am-surface-2, #f1f5f9)", padding: "3px", borderRadius: "8px", border: "1px solid var(--am-border, #e2e8f0)" }}>
                    <button
                      type="button"
                      onClick={() => setAudienceSource("brand")}
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        fontWeight: 600,
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        background: audienceSource === "brand" ? "var(--am-surface, #ffffff)" : "transparent",
                        color: audienceSource === "brand" ? "var(--am-ink, #0f172a)" : "var(--muted, #64748b)",
                        boxShadow: audienceSource === "brand" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      Contactos de Marca
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudienceSource("custom")}
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        fontWeight: 600,
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        background: audienceSource === "custom" ? "var(--am-surface, #ffffff)" : "transparent",
                        color: audienceSource === "custom" ? "var(--am-ink, #0f172a)" : "var(--muted, #64748b)",
                        boxShadow: audienceSource === "custom" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      Personalizado
                    </button>
                  </div>
                </div>

                {audienceSource === "custom" && (
                  <div
                    style={{
                      background: "var(--am-surface-2, #f8fafc)",
                      border: "1px solid var(--am-border, #e2e8f0)",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      display: "grid",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Mail size={14} style={{ color: "#4f46e5" }} />
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--am-ink, #1e293b)" }}>
                          Destinatarios específicos:
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: customEmails.length > 0 ? "#4338ca" : "var(--muted, #64748b)",
                            background: customEmails.length > 0 ? "#e0e7ff" : "rgba(0,0,0,0.04)",
                            padding: "2px 8px",
                            borderRadius: "12px",
                          }}
                        >
                          {customEmails.length} {customEmails.length === 1 ? "destinatario" : "destinatarios"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          style={{ display: "none" }}
                          onChange={handleFileUpload}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn"
                          style={{
                            fontSize: "11px",
                            padding: "4px 10px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            height: "28px",
                          }}
                        >
                          <UploadCloud size={13} />
                          Subir Excel / CSV
                        </button>
                        {customEmails.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCustomEmails([])}
                            style={{
                              fontSize: "11px",
                              color: "#ef4444",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              padding: "4px 6px",
                              fontWeight: 500,
                            }}
                          >
                            Limpiar lista
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--am-border, #cbd5e1)",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        minHeight: "44px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        alignItems: "center",
                        background: "var(--am-surface, #ffffff)",
                        position: "relative",
                      }}
                    >
                      {customEmails.map((email) => (
                        <span
                          key={email}
                          style={{
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
                          }}
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => removeCustomEmail(email)}
                            style={{
                              border: "none",
                              background: "none",
                              padding: 0,
                              cursor: "pointer",
                              display: "inline-flex",
                              color: "#4338ca",
                            }}
                            aria-label={`Eliminar ${email}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}

                      <input
                        type="text"
                        value={customEmailInput}
                        onChange={(e) => setCustomEmailInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "," || e.key === " ") {
                            e.preventDefault();
                            const email = customEmailInput.trim().replace(/[,\s;]/g, "");
                            if (email && email.includes("@")) {
                              addCustomEmails(email);
                            }
                          }
                        }}
                        onBlur={() => {
                          const email = customEmailInput.trim().replace(/[,\s;]/g, "");
                          if (email && email.includes("@")) {
                            addCustomEmails(email);
                          }
                        }}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData("text");
                          if (text && text.includes("@")) {
                            e.preventDefault();
                            addCustomEmails(text);
                          }
                        }}
                        placeholder={
                          customEmails.length === 0
                            ? "Escribe un correo o pega una lista (Enter para agregar)..."
                            : "Añadir otro correo..."
                        }
                        style={{
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          flex: 1,
                          minWidth: "180px",
                          fontSize: "12px",
                          color: "var(--am-ink, #1e293b)",
                          padding: "3px 0",
                        }}
                      />

                      {suggestedContacts.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "calc(100% + 4px)",
                            left: 0,
                            right: 0,
                            background: "var(--am-surface, #ffffff)",
                            border: "1px solid var(--am-border, #cbd5e1)",
                            borderRadius: "8px",
                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                            zIndex: 105,
                            maxHeight: "180px",
                            overflowY: "auto",
                            padding: "4px",
                          }}
                        >
                          <div style={{ padding: "4px 8px", fontSize: "11px", fontWeight: 600, color: "var(--muted, #64748b)", borderBottom: "1px solid var(--am-border, #f1f5f9)" }}>
                            Sugerencias de contactos ({suggestedContacts.length})
                          </div>
                          {suggestedContacts.map((c) => {
                            const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  addCustomEmails(c.email);
                                  setCustomEmailInput("");
                                }}
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "6px 8px",
                                  border: "none",
                                  background: "transparent",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                <div style={{ display: "grid" }}>
                                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--am-ink, #1e293b)" }}>
                                    {fullName || c.email.split("@")[0]}
                                  </span>
                                  <span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>{c.email}</span>
                                </div>
                                {c.company && (
                                  <span style={{ fontSize: "10px", color: "var(--muted, #64748b)", background: "var(--am-surface-2, #f1f5f9)", padding: "2px 6px", borderRadius: "4px" }}>
                                    {c.company}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {customUploadError && (
                      <small style={{ color: "#ef4444", fontSize: "11px", fontWeight: 500 }}>
                        {customUploadError}
                      </small>
                    )}
                  </div>
                )}
              </div>

              <fieldset><legend>Contenido que se preparará</legend><div className="automation-type-options">{automationTypes.map((type) => <button key={type.value} type="button" className={draft.type === type.value ? "active" : ""} disabled={(editingId !== "new" && draft.type !== type.value) || (existingTypes.has(type.value) && draft.type !== type.value)} onClick={() => setDraft({...draft,type:type.value})}><span><Sparkles size={15}/></span><div><strong>{type.label}</strong><p>{type.detail}</p></div>{draft.type === type.value && <Check size={13}/>}</button>)}</div></fieldset>
              <div className="automation-schedule-grid"><fieldset><legend>Frecuencia</legend><div className="automation-segmented"><button type="button" className={draft.frequency === "weekly" ? "active" : ""} onClick={() => setDraft({...draft,frequency:"weekly",day:Math.min(draft.day,7)})}>Semanal</button><button type="button" className={draft.frequency === "monthly" ? "active" : ""} onClick={() => setDraft({...draft,frequency:"monthly",day:1})}>Mensual</button></div></fieldset><fieldset><legend>{draft.frequency === "weekly" ? "Día" : "Día del mes"}</legend>{draft.frequency === "weekly" ? <div className="automation-weekdays">{weekDays.map((day,index) => <button key={day} type="button" className={draft.day === index + 1 ? "active" : ""} onClick={() => setDraft({...draft,day:index+1})}>{day}</button>)}</div> : <input aria-label="Día del mes" type="number" min="1" max="28" value={draft.day} onChange={(event) => setDraft({...draft,day:Number(event.target.value)})}/>}</fieldset><label className="automation-time"><span>Hora {draft.sendTime ? `(${formatTime12h(draft.sendTime)})` : ""}</span><input type="time" value={draft.sendTime} onChange={(event) => setDraft({...draft,sendTime:event.target.value})}/></label></div>
              <button type="button" className={`automation-approval-card ${draft.requiresApproval ? "active" : ""}`} aria-pressed={draft.requiresApproval} onClick={() => setDraft({...draft,requiresApproval:!draft.requiresApproval})}><span><ShieldCheck size={17}/></span><div><strong>Requerir aprobación antes de enviar</strong><small>La automatización solo creará el borrador; una persona deberá aprobarlo.</small></div><i>{draft.requiresApproval && <Check size={12}/>}</i></button>
            </div>
            <footer>
              {editingId !== "new" && (
                <button
                  className="btn"
                  type="button"
                  style={{color:"#ef4444", marginRight:"auto"}}
                  onClick={() => {
                    const item = items.find((i) => i.id === editingId);
                    if (item) promptDelete(item);
                  }}
                  disabled={Boolean(saving)}
                >
                  <Trash2 size={14}/>Eliminar automatización
                </button>
              )}
              <button className="btn" type="button" onClick={closeAutomation}>Cancelar</button>
              <button className="btn primary" type="button" onClick={() => void saveDraft()} disabled={Boolean(saving)}>{saving ? <Loader2 className="spin" size={14}/> : <Check size={14}/>}Guardar automatización</button>
            </footer>
          </section>
        </div>
      )}

      {/* Styled Confirmation Dialog for Deleting Automation */}
      {confirmDelete && (
        <div
          className="contacts-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setConfirmDelete(null); }}
        >
          <section
            ref={deleteModalRef}
            className="contacts-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-automation-delete-title"
            tabIndex={-1}
          >
            <span className="contacts-confirm-icon" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>
              <Trash2 size={20} />
            </span>
            <h2 id="confirm-automation-delete-title">¿Eliminar automatización?</h2>
            <p>
              ¿Estás seguro de que deseas eliminar <strong>{confirmDelete.name}</strong>? Esta acción cancelará las próximas ejecuciones programadas.
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
              <button
                className="btn"
                type="button"
                disabled={Boolean(saving)}
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </button>
              <button
                className="btn danger"
                type="button"
                disabled={Boolean(saving)}
                onClick={() => void executeDelete(confirmDelete.id)}
              >
                {saving ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
                {saving ? "Eliminando…" : "Eliminar automatización"}
              </button>
            </div>
          </section>
        </div>
      )}

      {message && (
        <div className={`toast ${message.error ? "toast-error" : ""}`} role="status">
          <span>{message.error ? <X size={14}/> : <CheckCircle2 size={14}/>} {message.text}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Cerrar notificación"><X size={13}/></button>
        </div>
      )}
    </div>
  );
}

