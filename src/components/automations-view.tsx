"use client";

import { CalendarClock, Check, Loader2, Plus, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Automation, AutomationType, Site } from "@/src/domain/types";
import { SiteMark, StatusBadge } from "./ui";

const automationTypes: Array<{ value: AutomationType; label: string }> = [
  { value: "weekly_new_properties", label: "Alertas de nuevas propiedades" },
  { value: "monthly_properties", label: "Resumen de propiedades disponibles" },
  { value: "monthly_blog", label: "Noticias y artículos del blog" },
];

export function AutomationsView({ initial, sites }: { initial: Automation[]; sites: Site[] }) {
  const [items, setItems] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [draft, setDraft] = useState({ siteId: sites[0]?.id ?? "", type: "weekly_new_properties" as AutomationType, frequency: "weekly" as Automation["frequency"], day: 1, sendTime: "09:00", requiresApproval: true });
  const existingTypes = useMemo(() => new Set(items.filter((item) => item.siteId === draft.siteId).map((item) => item.type)), [items, draft.siteId]);

  useEffect(() => { if (!message) return; const timeout = window.setTimeout(() => setMessage(null), 3600); return () => window.clearTimeout(timeout); }, [message]);

  async function update(id: string, patch: Partial<Automation>) {
    const current = items.find((item) => item.id === id); if (!current || saving) return;
    const normalized = { ...patch, ...(patch.frequency ? { day: 1 } : {}), frequency: patch.frequency ?? current.frequency };
    const previous = items; setSaving(id); setItems((list) => list.map((item) => item.id === id ? { ...item, ...normalized } : item));
    try {
      const response = await fetch(`/api/automations/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(normalized) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "No se pudo guardar.");
      setItems((list) => list.map((item) => item.id === id ? payload.automation : item)); setMessage({ text: "Cambios guardados." });
    } catch (error) { setItems(previous); setMessage({ text: error instanceof Error ? error.message : "No se pudo guardar.", error: true }); }
    finally { setSaving(null); }
  }

  async function create() {
    if (existingTypes.has(draft.type)) { setMessage({ text: "Este sitio ya tiene esa automatización.", error: true }); return; }
    setSaving("new");
    try {
      const response = await fetch("/api/automations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "No se pudo crear.");
      setItems((list) => [...list, payload.automation]); setCreating(false); setMessage({ text: "Automatización creada. Actívala cuando esté lista." });
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : "No se pudo crear.", error: true }); }
    finally { setSaving(null); }
  }

  return <div className="automations-workspace">
    <div className="automation-toolbar"><div><strong>{items.length} {items.length === 1 ? "automatización" : "automatizaciones"}</strong><span>{items.filter((item) => item.isEnabled).length} activas</span></div><button className="btn primary" onClick={() => setCreating((value) => !value)}>{creating ? <X size={15}/> : <Plus size={15}/>} {creating ? "Cancelar" : "Nueva automatización"}</button></div>

    {creating && <section className="card automation-create" aria-label="Nueva automatización"><div className="automation-create-head"><span className="automation-symbol"><CalendarClock size={18}/></span><div><h2>Nueva automatización</h2><p>Se creará desactivada para que puedas revisar su configuración.</p></div></div><div className="automation-create-grid"><label className="field"><span>Sitio</span><select value={draft.siteId} onChange={(event)=>setDraft({...draft,siteId:event.target.value})}>{sites.map((site)=><option value={site.id} key={site.id}>{site.name}</option>)}</select></label><label className="field"><span>Tipo</span><select value={draft.type} onChange={(event)=>setDraft({...draft,type:event.target.value as AutomationType})}>{automationTypes.map((type)=><option value={type.value} key={type.value} disabled={existingTypes.has(type.value)}>{type.label}{existingTypes.has(type.value)?" · ya configurada":""}</option>)}</select></label><label className="field"><span>Frecuencia</span><select value={draft.frequency} onChange={(event)=>setDraft({...draft,frequency:event.target.value as Automation["frequency"],day:1})}><option value="weekly">Semanal</option><option value="monthly">Mensual</option></select></label><label className="field"><span>{draft.frequency === "weekly" ? "Día de la semana" : "Día del mes"}</span><input type="number" min="1" max={draft.frequency === "weekly" ? 7 : 28} value={draft.day} onChange={(event)=>setDraft({...draft,day:Number(event.target.value)})}/></label><label className="field"><span>Hora de envío</span><input type="time" value={draft.sendTime} onChange={(event)=>setDraft({...draft,sendTime:event.target.value})}/></label><label className="approval-control"><input type="checkbox" checked={draft.requiresApproval} onChange={(event)=>setDraft({...draft,requiresApproval:event.target.checked})}/><ShieldCheck size={17}/><span><strong>Requerir aprobación</strong><small>La campaña no se enviará automáticamente.</small></span></label></div><div className="automation-create-actions"><button className="btn" onClick={()=>setCreating(false)}>Cancelar</button><button className="btn primary" onClick={create} disabled={saving === "new"}>{saving === "new" ? <Loader2 className="spin" size={15}/> : <Check size={15}/>}Crear automatización</button></div></section>}

    {items.length ? <div className="automation-groups">{sites.map((site) => { const siteItems=items.filter((item)=>item.siteId===site.id); if(!siteItems.length) return null; return <section key={site.id}><div className="group-head"><SiteMark site={site} small />{site.name}<span>{siteItems.filter((item)=>item.isEnabled).length}/{siteItems.length} activas</span></div><div className="card automation-list">{siteItems.map((item)=><article className={`automation-row ${item.isEnabled?"enabled":""}`} key={item.id}><div className="automation-identity"><span className="automation-symbol"><CalendarClock size={17}/></span><div><strong>{item.name}</strong><span>{item.nextRunAt === "Sin programar" ? "Aún no programada" : `Próxima: ${item.nextRunAt}`}</span></div></div><div className="automation-fields"><label><span>Frecuencia</span><select value={item.frequency} disabled={saving===item.id} onChange={(event)=>update(item.id,{frequency:event.target.value as Automation["frequency"]})}><option value="weekly">Semanal</option><option value="monthly">Mensual</option></select></label><label><span>{item.frequency === "weekly" ? "Día semanal" : "Día del mes"}</span><input type="number" min="1" max={item.frequency === "weekly"?7:28} value={item.day} disabled={saving===item.id} onChange={(event)=>update(item.id,{day:Number(event.target.value),frequency:item.frequency})}/></label><label><span>Hora</span><input type="time" value={item.sendTime} disabled={saving===item.id} onChange={(event)=>update(item.id,{sendTime:event.target.value})}/></label></div><label className="automation-approval" title="Requerir aprobación antes del envío"><input type="checkbox" checked={item.requiresApproval} disabled={saving===item.id} onChange={(event)=>update(item.id,{requiresApproval:event.target.checked})}/><ShieldCheck size={16}/><span>Aprobación</span></label><div className="automation-state"><StatusBadge status={item.isEnabled?"connected":"disabled"}/><button aria-label={`${item.isEnabled?"Desactivar":"Activar"} ${item.name}`} aria-pressed={item.isEnabled} className={`toggle ${item.isEnabled?"on":""}`} disabled={saving===item.id} onClick={()=>update(item.id,{isEnabled:!item.isEnabled})}>{saving===item.id&&<Loader2 className="spin" size={12}/>}</button></div></article>)}</div></section>})}</div> : !creating && <div className="card automation-zero"><span className="automation-symbol"><CalendarClock size={18}/></span><div><strong>Todavía no hay automatizaciones</strong><p>Crea el primer flujo real para uno de tus sitios.</p></div><button className="btn primary" onClick={()=>setCreating(true)}><Plus size={15}/>Crear la primera</button></div>}
    {message && <div className={`toast ${message.error?"toast-error":""}`} role="status">{message.text}</div>}
  </div>;
}
