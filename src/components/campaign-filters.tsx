"use client";

import { Filter, Loader2, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FilterMenu } from "@/src/components/filter-menu";

const typeOptions = [
  { value: "", label: "Todos los tipos" },
  { value: "weekly_new_properties", label: "Nuevas oficinas" },
  { value: "monthly_properties", label: "Oficinas mensuales" },
  { value: "monthly_blog", label: "Blog mensual" },
];

const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "draft", label: "Borradores" },
  { value: "ready", label: "Listas para enviar" },
  { value: "sent", label: "Enviadas" },
  { value: "failed", label: "Fallidas" },
];

export function CampaignFilters({
  initialQuery,
  initialType,
  initialStatus,
  resultCount,
}: {
  initialQuery: string;
  initialType: string;
  initialStatus: string;
  resultCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const skipQueryEffect = useRef(false);
  const hasFilters = Boolean(query.trim() || initialType || initialStatus);

  function replaceFilter(key: "q" | "type" | "status", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const normalized = value.trim();
    if (normalized) params.set(key, normalized);
    else params.delete(key);
    if (key !== "q") {
      const currentQuery = query.trim();
      if (currentQuery) params.set("q", currentQuery);
      else params.delete("q");
    }
    params.delete("new");
    const suffix = params.toString();
    startTransition(() => router.replace(`/campaigns${suffix ? `?${suffix}` : ""}`, { scroll: false }));
  }

  useEffect(() => {
    if (skipQueryEffect.current) {
      skipQueryEffect.current = false;
      return;
    }
    if (query.trim() === (searchParams.get("q") ?? "")) return;
    const timer = window.setTimeout(() => replaceFilter("q", query), 240);
    return () => window.clearTimeout(timer);
  // searchParams is intentionally omitted so a completed navigation does not restart the debounce.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function clearFilters() {
    skipQueryEffect.current = true;
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("type");
    params.delete("status");
    params.delete("new");
    const suffix = params.toString();
    startTransition(() => router.replace(`/campaigns${suffix ? `?${suffix}` : ""}`, { scroll: false }));
  }

  return (
    <section className={`card campaign-filter-panel ${isPending ? "is-updating" : ""}`} aria-busy={isPending}>
      <div className="campaign-filter-controls">
        <label className="campaign-filter-search">
          <Search size={15} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar campañas" placeholder="Buscar por nombre" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda"><X size={13} /></button>}
        </label>
        <div className="campaign-filter-menus"><Filter size={14} aria-hidden="true" />
          <FilterMenu label="Filtrar por tipo" value={initialType} options={typeOptions} onChange={(value) => replaceFilter("type", value)} />
          <FilterMenu label="Filtrar por estado" value={initialStatus} options={statusOptions} onChange={(value) => replaceFilter("status", value)} />
        </div>
        {hasFilters && <button className="campaign-filter-clear" type="button" onClick={clearFilters}>Limpiar</button>}
      </div>
      <div className="campaign-filter-result" aria-live="polite">
        {isPending && <Loader2 className="spin" size={13} aria-hidden="true" />}
        <strong>{resultCount}</strong> {resultCount === 1 ? "campaña" : "campañas"}
      </div>
    </section>
  );
}
