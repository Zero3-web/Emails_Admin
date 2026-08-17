"use client";
/* eslint-disable @next/next/no-img-element */

import { Building2, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { Property } from "@/src/domain/types";

type Result = { properties: Property[]; total: number; syncedAt: string };

const formatSyncTime = (value: string) => {
  const parts = new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Lima",
  }).formatToParts(new Date(value));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "--";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "--";
  return `${hour}:${minute}`;
};

export function TokkoConnectionCard({ initial, initialError = "" }: { initial?: Result | null; initialError?: string }) {
  const [result, setResult] = useState<Result | null>(initial ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/tokko/properties?limit=6", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "No se pudo consultar Tokko.");
      setResult(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar Tokko.");
    } finally { setLoading(false); }
  };
  useEffect(() => {
    if (initial || initialError) return;
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [initial, initialError]);

  return <section className="card tokko-console">
    <div className="tokko-console-head"><span className="resend-icon"><Building2 size={18}/></span><div><h2>Tokko Broker</h2><p>{loading ? "Comprobando conexión…" : error ? "No fue posible obtener propiedades" : `${result?.total.toLocaleString("es-PE")} propiedades disponibles en Tokko`}</p></div><span className={`badge ${error ? "error" : loading ? "pending" : "connected"}`}>{error ? "Error" : loading ? "Verificando" : "Conectado"}</span></div>
    {error ? <div className="tokko-error"><span>{error}</span><button className="btn" onClick={()=>void load()}><RefreshCw size={14}/>Reintentar</button></div> : <>
      {result?.properties.length ? <div className="tokko-property-list">{result.properties.map((property)=><article key={property.id} className="tokko-property"><div className="tokko-thumb">{property.imageUrl ? <img src={property.imageUrl} alt={`Imagen de ${property.title}`}/> : <Building2 size={17}/>}</div><div><strong>{property.title}</strong><span>{property.location} · {property.propertyType}</span></div><div className="tokko-price">{property.price ? `${property.currency} ${property.price.toLocaleString("es-PE")}` : "Precio no publicado"}</div>{property.publicUrl && <a href={property.publicUrl} target="_blank" rel="noreferrer" aria-label={`Abrir ${property.title} en Tokko`}><ExternalLink size={15}/></a>}</article>)}</div> : !loading && <p className="tokko-empty">Tokko respondió correctamente, pero no hay propiedades visibles para esta credencial.</p>}
      <div className="tokko-console-foot"><span>{result?.syncedAt ? `Consulta realizada ${formatSyncTime(result.syncedAt)}` : ""}</span><button className="btn" onClick={()=>void load()} disabled={loading}>{loading ? <Loader2 className="spin" size={14}/> : <RefreshCw size={14}/>}Actualizar</button></div>
    </>}
  </section>;
}
