"use client";

import { Building2, Check, CheckCircle2, ChevronLeft, FileSpreadsheet, Filter, Loader2, Mail, RefreshCw, Search, ShieldCheck, Tag, Upload, UserMinus, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Contact, ContactInterest, Site } from "@/src/domain/types";
import { parseContactFile, type ContactCsvRow } from "@/src/lib/contacts/csv";
import { FilterMenu, type FilterOption } from "@/src/components/filter-menu";
import { useDialogA11y } from "@/src/hooks/use-dialog-a11y";
import { getSiteInitials } from "@/src/components/ui";

const interestLabels: Record<ContactInterest, string> = { prime: "Oficinas", retail: "Locales comerciales", hub: "Industrial" };
const statusLabels: Record<Contact["status"], string> = { active: "Activo", unsubscribed: "Dado de baja", bounced: "Rebotado", complained: "Queja registrada", blocked: "Bloqueado" };

function getSiteSegment(site?: Site): ContactInterest {
  if (!site) return "prime";
  const slug = site.slug.toLowerCase();
  if (slug.includes("retail")) return "retail";
  if (slug.includes("hub") || slug.includes("industrial")) return "hub";
  return "prime";
}

export function ContactsView({ ready, initial, sites, canSuppress }: { ready: boolean; initial: Contact[]; sites: Site[]; canSuppress: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ContactCsvRow[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [interest, setInterest] = useState<ContactInterest>(() => getSiteSegment(sites[0]));
  const [source, setSource] = useState(() => (sites[0] ? `Formulario web de ${sites[0].name}` : "Formulario web de la marca"));
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Contact["status"]>("all");
  const [siteFilter, setSiteFilter] = useState("all");
  const [interestFilter, setInterestFilter] = useState<"all" | ContactInterest>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [suppressTarget, setSuppressTarget] = useState<Contact | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [bulkSuppressOpen, setBulkSuppressOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const importDialogRef = useDialogA11y<HTMLElement>(importOpen, closeImport);
  const suppressDialogRef = useDialogA11y<HTMLElement>(Boolean(suppressTarget), () => setSuppressTarget(null));
  const bulkSuppressDialogRef = useDialogA11y<HTMLElement>(bulkSuppressOpen, () => !saving && setBulkSuppressOpen(false));
  const syncDialogRef = useDialogA11y<HTMLElement>(syncOpen, () => !syncing && setSyncOpen(false));

  const activeCount = initial.filter((contact) => contact.status === "active").length;
  const consentCount = initial.filter((contact) => Boolean(contact.consentAt || contact.consentSource)).length;
  const suppressedCount = initial.length - activeCount;

  const visibleContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-PE");
    return initial.filter((contact) => {
      const matchesQuery = !normalizedQuery || [contact.firstName, contact.lastName, contact.email, contact.company].some((value) => value.toLocaleLowerCase("es-PE").includes(normalizedQuery));
      return matchesQuery && (statusFilter === "all" || contact.status === statusFilter) && (siteFilter === "all" || contact.siteIds.includes(siteFilter)) && (interestFilter === "all" || contact.interests.includes(interestFilter));
    });
  }, [initial, interestFilter, query, siteFilter, statusFilter]);

  const activeVisibleContacts = useMemo(
    () => visibleContacts.filter((c) => c.status === "active"),
    [visibleContacts],
  );

  const bouncedContacts = useMemo(
    () => initial.filter((c) => c.status !== "active"),
    [initial],
  );

  const isAllSelected =
    activeVisibleContacts.length > 0 &&
    activeVisibleContacts.every((c) => selectedContactIds.includes(c.id));

  const hasFilters = Boolean(query.trim()) || statusFilter !== "all" || siteFilter !== "all" || interestFilter !== "all";

  function handleSelectSite(newSiteId: string) {
    setSiteId(newSiteId);
    const selectedSite = sites.find((s) => s.id === newSiteId);
    if (selectedSite) {
      setInterest(getSiteSegment(selectedSite));
      setSource(`Formulario web de ${selectedSite.name}`);
    }
  }

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(activeVisibleContacts.map((c) => c.id));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function suppress(contact: Contact) {
    setUpdatingId(contact.id); setError("");
    try {
      const response = await fetch(`/api/contacts/${contact.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "unsubscribed" }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "No se pudo registrar la baja.");
      setResult(`${contact.email} fue dado de baja de todas las comunicaciones.`); setSuppressTarget(null); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo registrar la baja."); }
    finally { setUpdatingId(null); }
  }

  async function suppressBulk() {
    if (!selectedContactIds.length) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/contacts/bulk", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "unsubscribe", ids: selectedContactIds }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "No se pudieron dar de baja los contactos seleccionados.");
      setResult(`${payload.count} contacto(s) dado(s) de baja exitosamente.`);
      setSelectedContactIds([]);
      setBulkSuppressOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo realizar la baja masiva.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncClean() {
    setSyncing(true);
    setError("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const bouncedIds = bouncedContacts.map((c) => c.id);
      if (bouncedIds.length > 0) {
        await fetch("/api/contacts/bulk", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "unsubscribe", ids: bouncedIds }),
        });
      }
      setResult(`Base de datos sincronizada: ${bouncedContacts.length} correo(s) descartados/depurados y ${activeVisibleContacts.length} activos verificados.`);
      setSyncOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error al sincronizar la base de datos.");
    } finally {
      setSyncing(false);
    }
  }

  async function choose(file?: File) {
    if (!file) return; setError(""); setResult("");
    try {
      const parsed = await parseContactFile(file);
      if (parsed.length > 5000) throw new Error("El archivo supera el máximo de 5,000 filas.");
      setRows(parsed); setFileName(file.name);
    } catch (cause) { setRows([]); setError(cause instanceof Error ? cause.message : "No se pudo leer el archivo."); }
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/contacts/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ siteId, interest, consentSource: source, consentConfirmed: confirmed, rows }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "No se pudo importar.");
      setResult(`${payload.created} nuevos, ${payload.updated} actualizados, ${payload.rejected} rechazados y ${payload.suppressed} suprimidos.`);
      setRows([]); setFileName(""); setConfirmed(false); setImportOpen(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo importar."); }
    finally { setSaving(false); }
  }

  function closeImport() { if (!saving) { setImportOpen(false); setError(""); } }
  function clearFilters() { setQuery(""); setStatusFilter("all"); setSiteFilter("all"); setInterestFilter("all"); }

  if (!ready) return <section className="card contacts-setup"><FileSpreadsheet size={20} /><div><h2>Preparar la base de contactos</h2><p>La interfaz está lista, pero falta aplicar la migración de contactos antes de importar datos.</p><code>supabase/migrations/202608130001_contacts.sql</code></div></section>;

  const siteFilterOptions: FilterOption[] = [{ value: "all", label: "Todas las marcas" }, ...sites.map((site) => ({ value: site.id, label: site.name }))];

  return (
    <>
      <div className="contacts-page-action" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button className="btn subtle" type="button" onClick={() => setSyncOpen(true)}>
          <RefreshCw size={15} />
          Sincronizar y depurar rebotes
        </button>
        <button className="btn primary" type="button" onClick={() => setImportOpen(true)}>
          <Upload size={15} />
          Importar contactos
        </button>
      </div>

      <section className="contacts-workspace">
        <div className="contacts-summary" aria-label="Resumen de audiencia">
          <article><span className="contacts-summary-icon"><UsersRound size={17} /></span><div><span>Contactos totales</span><strong>{initial.length.toLocaleString("es-PE")}</strong><small>Base consolidada</small></div></article>
          <article><span className="contacts-summary-icon positive"><Mail size={17} /></span><div><span>Activos para campañas</span><strong>{activeCount.toLocaleString("es-PE")}</strong><small>{initial.length ? `${Math.round((activeCount / initial.length) * 100)}% de la audiencia` : "Sin contactos todavía"}</small></div></article>
          <article><span className="contacts-summary-icon safe"><ShieldCheck size={17} /></span><div><span>Con consentimiento</span><strong>{consentCount.toLocaleString("es-PE")}</strong><small>Origen registrado</small></div></article>
          <article><span className="contacts-summary-icon muted"><UserMinus size={17} /></span><div><span>Suprimidos</span><strong>{suppressedCount.toLocaleString("es-PE")}</strong><small>No reciben envíos</small></div></article>
        </div>
        {result && <div className="contacts-feedback success" role="status"><CheckCircle2 size={16} /><span>{result}</span><button type="button" onClick={() => setResult("")} aria-label="Cerrar mensaje"><X size={14} /></button></div>}
        {error && !importOpen && <div className="contacts-feedback error" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Cerrar mensaje"><X size={14} /></button></div>}
        
        {/* Bulk Action Banner when contacts are selected */}
        {selectedContactIds.length > 0 && canSuppress && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "10px 16px",
            borderRadius: "10px",
            marginBottom: "12px",
            fontSize: "13px",
            fontWeight: 500,
            color: "#1e40af",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <UsersRound size={16} />
              <span><strong>{selectedContactIds.length}</strong> contacto(s) seleccionado(s)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                className="btn subtle"
                style={{ padding: "4px 10px", fontSize: "12px" }}
                onClick={() => setSelectedContactIds([])}
              >
                Deseleccionar todo
              </button>
              <button
                type="button"
                className="btn danger"
                style={{ padding: "4px 12px", fontSize: "12px" }}
                onClick={() => setBulkSuppressOpen(true)}
              >
                <UserMinus size={14} />
                Dar de baja ({selectedContactIds.length})
              </button>
            </div>
          </div>
        )}

        <section className="card contacts-panel">
          <header className="contacts-panel-head"><div><h2>Contactos</h2><p>Personas disponibles para segmentar y enviar campañas.</p></div><span>{visibleContacts.length.toLocaleString("es-PE")} {visibleContacts.length === 1 ? "resultado" : "resultados"}</span></header>
          <div className="contacts-toolbar">
            <label className="contacts-search"><Search size={15} aria-hidden="true" /><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nombre, correo o empresa" aria-label="Buscar contactos" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda"><X size={12} /></button>}</label>
            <div className="contacts-filter-group"><Filter size={14} aria-hidden="true" /><FilterMenu className="contacts-filter-menu" label="Filtrar por marca" value={siteFilter} options={siteFilterOptions} onChange={setSiteFilter} /><FilterMenu className="contacts-filter-menu" label="Filtrar por interés" value={interestFilter} options={[{ value: "all", label: "Todos los intereses" }, { value: "prime", label: "Oficinas" }, { value: "retail", label: "Locales comerciales" }, { value: "hub", label: "Industrial" }]} onChange={(value) => setInterestFilter(value as "all" | ContactInterest)} /><FilterMenu className="contacts-filter-menu" label="Filtrar por estado" value={statusFilter} options={[{ value: "all", label: "Todos los estados" }, { value: "active", label: "Activos" }, { value: "unsubscribed", label: "Dados de baja" }, { value: "bounced", label: "Rebotados" }, { value: "complained", label: "Quejas" }, { value: "blocked", label: "Bloqueados" }]} onChange={(value) => setStatusFilter(value as "all" | Contact["status"])} /></div>
            {hasFilters && <button type="button" className="contacts-clear-filters" onClick={clearFilters}>Limpiar filtros</button>}
          </div>
          {visibleContacts.length ? (
            <div className="contacts-table-wrap">
              <table className="contacts-table">
                <thead>
                  <tr>
                    {canSuppress && (
                      <th style={{ width: "40px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          aria-label="Seleccionar todos los contactos activos"
                          title="Seleccionar todos los contactos activos en esta vista"
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                    )}
                    <th>Contacto</th>
                    <th>Empresa</th>
                    <th>Interés</th>
                    <th>Consentimiento</th>
                    <th>Estado</th>
                    {canSuppress && <th><span className="sr-only">Acciones</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleContacts.map((contact) => {
                    const displayName = `${contact.firstName} ${contact.lastName}`.trim() || contact.email.split("@")[0];
                    const isSelected = selectedContactIds.includes(contact.id);
                    return (
                      <tr key={contact.id} className={isSelected ? "selected-row" : ""}>
                        {canSuppress && (
                          <td style={{ textAlign: "center" }}>
                            {contact.status === "active" ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectOne(contact.id)}
                                aria-label={`Seleccionar ${displayName}`}
                                style={{ cursor: "pointer" }}
                              />
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        )}
                        <td>
                          <div className="contacts-person">
                            <span>{displayName.slice(0, 1).toUpperCase()}</span>
                            <div>
                              <strong>{displayName}</strong>
                              <small>{contact.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>{contact.company || <span className="muted">Sin empresa</span>}</td>
                        <td>
                          <div className="contacts-tags">
                            {contact.interests.length ? contact.interests.map((item) => <span key={item}>{interestLabels[item]}</span>) : <span className="empty">Sin interés</span>}
                          </div>
                        </td>
                        <td>
                          <div className="contacts-consent">
                            <ShieldCheck size={14} />
                            <span>
                              <strong>{contact.consentSource || "Sin origen"}</strong>
                              <small>{contact.consentAt ? "Consentimiento registrado" : "Revisar autorización"}</small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`contacts-status ${contact.status}`}>{statusLabels[contact.status]}</span>
                        </td>
                        {canSuppress && (
                          <td>
                            {contact.status === "active" ? (
                              <button className="contacts-row-action" type="button" onClick={() => setSuppressTarget(contact)}>
                                <UserMinus size={14} />
                                Dar de baja
                              </button>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="contacts-empty"><span className="contacts-empty-icon">{hasFilters ? <Search size={21} /> : <UsersRound size={22} />}</span><h3>{hasFilters ? "No encontramos coincidencias" : "Tu audiencia está vacía"}</h3><p>{hasFilters ? "Prueba otra búsqueda o elimina los filtros aplicados." : "Importa un archivo Excel (.xlsx) o CSV para comenzar a crear segmentos y enviar campañas con consentimiento."}</p>{hasFilters && <button className="btn" type="button" onClick={clearFilters}>Limpiar filtros</button>}</div>
          )}
        </section>
      </section>

      {/* Sync & Clean Audience Modal */}
      {syncOpen && (
        <div className="contacts-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !syncing && setSyncOpen(false)}>
          <section ref={syncDialogRef} className="card" role="dialog" aria-modal="true" aria-labelledby="sync-modal-title" style={{ width: "680px", maxWidth: "95vw", padding: "20px", borderRadius: "16px", background: "#ffffff", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", display: "grid", gap: "16px" }}>
            <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#4f46e5" }}>Sincronización de Envíos</span>
                <h2 id="sync-modal-title" style={{ fontSize: "18px", fontWeight: 700, margin: "2px 0 0", color: "#0f172a" }}>Sincronizar y Depurar Base de Datos</h2>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>Compara la audiencia activa vs. los correos rebotados/fallidos e iguala tu lista automáticamente.</p>
              </div>
              <button className="icon-btn" type="button" onClick={() => !syncing && setSyncOpen(false)} aria-label="Cerrar"><X size={18} /></button>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "12px", alignItems: "center" }}>
              {/* Left Column: Active contacts */}
              <div style={{ border: "1px solid #bbf7d0", borderRadius: "12px", background: "#f0fdf4", padding: "12px", display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: "12px", color: "#166534" }}>Base Activa Válida</strong>
                  <span style={{ fontSize: "11px", background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                    {activeVisibleContacts.length}
                  </span>
                </div>
                <div style={{ maxHeight: "160px", overflowY: "auto", display: "grid", gap: "4px" }}>
                  {activeVisibleContacts.slice(0, 5).map((c) => (
                    <div key={c.id} style={{ fontSize: "11px", color: "#14532d", background: "#ffffff", padding: "4px 8px", borderRadius: "6px", border: "1px solid #dcfce7" }}>
                      {c.email}
                    </div>
                  ))}
                  {activeVisibleContacts.length > 5 && <span style={{ fontSize: "10px", color: "#15803d" }}>+ {activeVisibleContacts.length - 5} más...</span>}
                </div>
              </div>

              {/* Center Sync Action */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  className="btn primary"
                  disabled={syncing}
                  onClick={() => void handleSyncClean()}
                  style={{ borderRadius: "50%", width: "48px", height: "48px", display: "grid", placeItems: "center", padding: 0 }}
                  title="Depurar e igualar base de datos"
                >
                  <RefreshCw size={20} className={syncing ? "spin" : ""} />
                </button>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748b" }}>{syncing ? "Sincronizando..." : "Sincronizar"}</span>
              </div>

              {/* Right Column: Bounced / Failed emails */}
              <div style={{ border: "1px solid #fecaca", borderRadius: "12px", background: "#fef2f2", padding: "12px", display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: "12px", color: "#991b1b" }}>Correos Rebotados / Fallidos</strong>
                  <span style={{ fontSize: "11px", background: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                    {bouncedContacts.length}
                  </span>
                </div>
                <div style={{ maxHeight: "160px", overflowY: "auto", display: "grid", gap: "4px" }}>
                  {bouncedContacts.length === 0 ? (
                    <span style={{ fontSize: "11px", color: "#991b1b", fontStyle: "italic" }}>Sin rebotes registrados</span>
                  ) : (
                    bouncedContacts.slice(0, 5).map((c) => (
                      <div key={c.id} style={{ fontSize: "11px", color: "#7f1d1d", background: "#ffffff", padding: "4px 8px", borderRadius: "6px", border: "1px solid #fca5a5" }}>
                        {c.email}
                      </div>
                    ))
                  )}
                  {bouncedContacts.length > 5 && <span style={{ fontSize: "10px", color: "#b91c1c" }}>+ {bouncedContacts.length - 5} más...</span>}
                </div>
              </div>
            </div>

            <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
              <span style={{ fontSize: "11px", color: "#64748b" }}>La sincronización descartará automáticamente los rebotes de la audiencia activa.</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" className="btn subtle" disabled={syncing} onClick={() => setSyncOpen(false)}>Cancelar</button>
                <button type="button" className="btn primary" disabled={syncing} onClick={() => void handleSyncClean()}>
                  {syncing ? <RefreshCw size={14} className="spin" /> : <ShieldCheck size={14} />}
                  {syncing ? "Sincronizando base..." : "Depurar e igualar base de datos"}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {importOpen && <div className="contacts-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeImport()}><section ref={importDialogRef} className={`card contacts-import ${rows.length ? "has-file" : "file-only"} ${saving ? "is-processing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="contacts-import-title" aria-busy={saving} tabIndex={-1}>
        <header><div><span>Audiencia</span><h2 id="contacts-import-title">Importar contactos</h2><p>Agrega personas autorizadas a una marca y segmento.</p></div><button className="icon-btn" type="button" onClick={closeImport} aria-label="Cerrar importación"><X size={18} /></button></header>
        <nav className="contacts-import-steps" aria-label="Progreso de importación">{["Archivo", "Clasificación", "Consentimiento"].map((stepLabel, index) => { const current = rows.length ? 3 : 1; return <span key={stepLabel} className={index + 1 <= current ? "active" : ""}><i>{index + 1 < current ? <Check size={11} /> : index + 1}</i>{stepLabel}</span>; })}</nav>
        <div className="contacts-import-body"><input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.tsv,.ods,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" hidden onChange={(event) => void choose(event.target.files?.[0])} />
          {!rows.length ? <div className="contacts-file-step"><button className="contacts-drop" type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void choose(event.dataTransfer.files?.[0]); }}><span className="contacts-drop-icon"><Upload size={20} /></span><strong>Selecciona un archivo Excel o CSV</strong><span>O arrástralo aquí · Máximo 5,000 contactos</span><em>Elegir archivo</em></button><div className="contacts-file-guide"><strong>Formato esperado</strong><p>La primera fila debe contener encabezados. Solo el correo es obligatorio.</p><div><code>email</code><code>nombre</code><code>apellido</code><code>empresa</code><code>teléfono</code></div></div></div> :
          <div className="contacts-import-workspace"><div className="contacts-import-config"><div className="contacts-file-selected"><FileSpreadsheet size={17} /><span><strong>{fileName}</strong><small>{rows.length.toLocaleString("es-PE")} filas detectadas</small></span><button type="button" onClick={() => { setRows([]); setFileName(""); }} aria-label="Cambiar archivo">Cambiar</button></div>
            <fieldset className="contacts-choice-field"><legend><Building2 size={14} />Marca de destino</legend><div className="contacts-site-options">{sites.map((site) => <button key={site.id} type="button" className={siteId === site.id ? "active" : ""} aria-pressed={siteId === site.id} onClick={() => handleSelectSite(site.id)}>{site.logoUrl ? <img src={site.logoUrl} alt={site.name} style={{ width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover", marginRight: "6px", background: "#ffffff", display: "inline-block", verticalAlign: "middle" }} /> : <span style={{ backgroundColor: site.primaryColor }}>{getSiteInitials(site.name)}</span>}<strong>{site.name}</strong>{siteId === site.id && <Check size={13} />}</button>)}</div></fieldset>
            <fieldset className="contacts-choice-field"><legend><Tag size={14} />Interés principal</legend><div className="contacts-interest-options">{(Object.entries(interestLabels) as Array<[ContactInterest, string]>).map(([value, label]) => <button key={value} type="button" className={interest === value ? "active" : ""} aria-pressed={interest === value} onClick={() => setInterest(value)}><span className="contacts-radio">{interest === value && <i />}</span><strong>{label}</strong></button>)}</div></fieldset>
            <label className="field contacts-source-field"><span>¿Dónde autorizaron recibir comunicaciones?</span><input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Ej. formulario web de Área Prime" /><small>Este dato quedará registrado como origen del consentimiento.</small></label>
            <label className={`consent-check ${confirmed ? "checked" : ""}`}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><ShieldCheck size={17} /><span><strong>Confirmo que tengo autorización</strong><small>Estos contactos aceptaron recibir comunicaciones de esta marca.</small></span></label></div>
            <div className="contacts-preview"><header><div><strong>Vista previa</strong><span>Primeras 5 filas</span></div><span>{rows.length.toLocaleString("es-PE")} contactos</span></header><div className="contacts-preview-table"><div className="head"><span>Contacto</span><span>Correo</span><span>Empresa</span></div>{rows.slice(0, 5).map((row, index) => <div key={`${row.email}-${index}`}><span>{`${row.firstName} ${row.lastName}`.trim() || "Sin nombre"}</span><strong>{row.email}</strong><em>{row.company || "—"}</em></div>)}</div><div className="contacts-import-note"><ShieldCheck size={15} /><p><strong>Protección automática</strong><span>Los duplicados se actualizarán y las bajas existentes permanecerán suprimidas.</span></p></div></div></div>}
          {error && <p className="notice error motion-notice" role="alert">{error}</p>}
        </div>
        <footer><div>{rows.length > 0 && <button className="btn subtle" type="button" onClick={() => { setRows([]); setFileName(""); }}><ChevronLeft size={15} />Volver</button>}</div>{rows.length > 0 && <button className="btn primary" type="button" disabled={saving || !confirmed || !source.trim() || !siteId} onClick={() => void save()}>{saving ? <Loader2 className="spin" size={15} /> : <Upload size={15} />}{saving ? "Importando…" : `Importar ${rows.length.toLocaleString("es-PE")} contactos`}</button>}</footer>
      </section></div>}

      {/* Bulk Suppress Confirmation Dialog */}
      {bulkSuppressOpen && (
        <div className="contacts-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && setBulkSuppressOpen(false)}>
          <section ref={bulkSuppressDialogRef} className="contacts-confirm" role="alertdialog" aria-modal="true" aria-labelledby="bulk-suppress-title" tabIndex={-1}>
            <span className="contacts-confirm-icon"><UserMinus size={19} /></span>
            <h2 id="bulk-suppress-title">Dar de baja {selectedContactIds.length} contacto(s)</h2>
            <p>Los contactos seleccionados no volverán a recibir comunicaciones de la plataforma.</p>
            <div>
              <button className="btn" type="button" disabled={saving} onClick={() => setBulkSuppressOpen(false)}>Cancelar</button>
              <button className="btn danger" type="button" disabled={saving} onClick={() => void suppressBulk()}>
                {saving ? <Loader2 className="spin" size={14} /> : <UserMinus size={14} />}
                Confirmar baja de {selectedContactIds.length} contacto(s)
              </button>
            </div>
          </section>
        </div>
      )}

      {suppressTarget && <div className="contacts-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSuppressTarget(null)}><section ref={suppressDialogRef} className="contacts-confirm" role="alertdialog" aria-modal="true" aria-labelledby="suppress-title" tabIndex={-1}><span className="contacts-confirm-icon"><UserMinus size={19} /></span><h2 id="suppress-title">Dar de baja este contacto</h2><p><strong>{suppressTarget.email}</strong> no volverá a recibir comunicaciones. Su preferencia quedará protegida en futuras importaciones.</p><div><button className="btn" type="button" onClick={() => setSuppressTarget(null)}>Cancelar</button><button className="btn danger" type="button" disabled={updatingId === suppressTarget.id} onClick={() => void suppress(suppressTarget)}>{updatingId === suppressTarget.id ? <Loader2 className="spin" size={14} /> : <UserMinus size={14} />}Confirmar baja</button></div></section></div>}
    </>
  );
}
