export default function PanelLoading() {
  return <div className="page-skeleton" aria-label="Cargando contenido" aria-busy="true">
    <div className="skeleton-line eyebrow-line" />
    <div className="skeleton-line title-line" />
    <div className="skeleton-line copy-line" />
    <div className="skeleton-card skeleton-primary" />
    <div className="skeleton-grid"><div className="skeleton-card"/><div className="skeleton-card"/><div className="skeleton-card"/></div>
  </div>;
}
