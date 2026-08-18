"use client";

import { AlertCircle, CalendarDays, Check, CheckCircle2, Clock3, Mail, RefreshCw, Search, Send, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type SentEmailItem = { id: string; to: string; subject: string; from: string; date: string; status: string; errorMessage?: string };
const statusMeta: Record<string,{label:string; tone:string}> = {
  sent:{label:"Enviado",tone:"sent"}, delivered:{label:"Entregado",tone:"delivered"}, bounced:{label:"Rebotado",tone:"bounced"}, failed:{label:"Fallido",tone:"failed"}, queued:{label:"En cola",tone:"pending"}, opened:{label:"Abierto",tone:"delivered"}, clicked:{label:"Con clic",tone:"delivered"}, complained:{label:"Reportado",tone:"failed"}, delivery_delayed:{label:"Demorado",tone:"pending"},
};
const normalizeStatus = (status:string) => status.replace(/^email\./,"").replaceAll(".","_");
const formatDate = (value:string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Fecha no disponible" : new Intl.DateTimeFormat("es-PE",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date); };

export function SentEmailsHistory() {
  const [items,setItems]=useState<SentEmailItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [fromDate,setFromDate]=useState("");
  const [toDate,setToDate]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [query,setQuery]=useState("");
  const [checking,setChecking]=useState<string|null>(null);
  const load=async()=>{setLoading(true);setLoadError("");try{const response=await fetch("/api/resend/emails",{cache:"no-store"});const payload=await response.json();if(!response.ok)throw new Error(payload.error??"No se pudo consultar la actividad.");setItems(payload.emails??[])}catch(error){setLoadError(error instanceof Error?error.message:"No se pudo consultar la actividad.")}finally{setLoading(false)}};
  useEffect(()=>{const timer=window.setTimeout(()=>{void load()},0);return()=>window.clearTimeout(timer)},[]);
  const rows=useMemo(()=>items.filter(item=>{const date=item.date?.slice(0,10)??"";const state=normalizeStatus(item.status);return (!fromDate||date>=fromDate)&&(!toDate||date<=toDate)&&(statusFilter==="all"||state===statusFilter)&&(!query||`${item.to} ${item.subject} ${item.from} ${item.id}`.toLowerCase().includes(query.toLowerCase()))}),[items,fromDate,toDate,statusFilter,query]);
  const delivered=items.filter((item)=>["delivered","opened","clicked"].includes(normalizeStatus(item.status))).length;
  const attention=items.filter((item)=>["bounced","failed","complained"].includes(normalizeStatus(item.status))).length;
  const recipients=new Set(items.map((item)=>item.to.toLowerCase())).size;
  const hasFilters=Boolean(query||fromDate||toDate||statusFilter!=="all");
  const clearFilters=()=>{setQuery("");setFromDate("");setToDate("");setStatusFilter("all")};
  const refresh=async(id:string)=>{setChecking(id);try{const response=await fetch(`/api/resend/emails/${id}`);const payload=await response.json();if(response.ok&&payload.email)setItems(current=>current.map(item=>item.id===id?{...item,status:payload.email.last_event??payload.email.status??item.status}:item))}finally{setChecking(null)}};

  if(loading)return <div className="activity-loading" aria-label="Cargando actividad"><span><RefreshCw className="spin" size={18}/></span><strong>Actualizando actividad…</strong><small>Estamos consultando el estado más reciente de los envíos.</small></div>;
  if(loadError)return <div className="card activity-error"><span><AlertCircle size={20}/></span><div><strong>No pudimos cargar la actividad</strong><p>{loadError}</p></div><button className="btn" onClick={()=>void load()}><RefreshCw size={13}/>Reintentar</button></div>;

  return <div className="activity-workspace">
    <section className="activity-overview" aria-label="Resumen de actividad">
      <article><span className="activity-overview-icon"><Send size={16}/></span><div><strong>{items.length}</strong><small>correos registrados</small></div></article>
      <article><span className="activity-overview-icon positive"><CheckCircle2 size={16}/></span><div><strong>{delivered}</strong><small>entregados</small></div></article>
      <article><span className={`activity-overview-icon ${attention ? "attention" : ""}`}><AlertCircle size={16}/></span><div><strong>{attention}</strong><small>requieren atención</small></div></article>
      <article><span className="activity-overview-icon"><UsersRound size={16}/></span><div><strong>{recipients}</strong><small>destinatarios únicos</small></div></article>
    </section>

    <section className="card activity-panel"><header><div><h2>Historial de envíos</h2><p>Consulta destinatario, asunto y estado de entrega.</p></div><button className="btn" onClick={()=>void load()}><RefreshCw size={13}/>Actualizar</button></header>
      <div className="activity-toolbar"><label className="activity-search"><Search size={14}/><input aria-label="Buscar en actividad" placeholder="Buscar destinatario o asunto" value={query} onChange={(event)=>setQuery(event.target.value)}/>{query&&<button type="button" aria-label="Limpiar búsqueda" onClick={()=>setQuery("")}><X size={12}/></button>}</label><div className="activity-status-filters" aria-label="Filtrar por estado">{[["all","Todos"],["sent","Enviados"],["delivered","Entregados"],["bounced","Rebotados"],["failed","Fallidos"]].map(([value,label])=><button key={value} type="button" className={statusFilter===value?"active":""} aria-pressed={statusFilter===value} onClick={()=>setStatusFilter(value)}>{label}</button>)}</div><details className="activity-date-filter"><summary><CalendarDays size={13}/>Fechas{(fromDate||toDate)&&<i/>}</summary><div><label>Desde<input aria-label="Desde" type="date" value={fromDate} onChange={(event)=>setFromDate(event.target.value)}/></label><label>Hasta<input aria-label="Hasta" type="date" value={toDate} onChange={(event)=>setToDate(event.target.value)}/></label></div></details>{hasFilters&&<button className="activity-clear" type="button" onClick={clearFilters}>Limpiar</button>}</div>
      <div className="activity-result-line"><span>{rows.length} {rows.length===1?"resultado":"resultados"}</span>{hasFilters&&<small>Filtros aplicados</small>}</div>
      {rows.length?<div className="activity-table-wrap"><table className="activity-table"><thead><tr><th>Fecha</th><th>Destinatario</th><th>Comunicación</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{rows.map((item)=>{const state=normalizeStatus(item.status);const meta=statusMeta[state]??{label:"En proceso",tone:"pending"};return <tr key={item.id}><td><span className="activity-date"><Clock3 size={12}/>{formatDate(item.date)}</span></td><td><span className="activity-recipient"><i>{item.to.slice(0,1).toUpperCase()}</i><strong>{item.to}</strong></span></td><td><span className="activity-message"><strong>{item.subject||"Sin asunto"}</strong><small><Mail size={10}/>{item.from}</small></span></td><td><span className={`activity-status ${meta.tone}`}>{meta.tone==="delivered"?<Check size={11}/>:meta.tone==="failed"||meta.tone==="bounced"?<AlertCircle size={11}/>:<Send size={11}/>} {meta.label}</span></td><td><button className="activity-refresh-row" type="button" aria-label={`Verificar estado de ${item.to}`} disabled={checking===item.id} onClick={()=>void refresh(item.id)}><RefreshCw className={checking===item.id?"spin":""} size={13}/><span>Verificar</span></button></td></tr>})}</tbody></table></div>:<div className="activity-empty"><span><Search size={19}/></span><strong>No encontramos actividad</strong><p>{items.length?"Prueba con otros filtros o una búsqueda más amplia.":"Los envíos aparecerán aquí cuando realices la primera prueba."}</p>{hasFilters&&<button className="btn" type="button" onClick={clearFilters}>Limpiar filtros</button>}</div>}
    </section>
  </div>;
}
