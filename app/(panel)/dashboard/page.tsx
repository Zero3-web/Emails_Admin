import {
  PageHeader,
  SiteCard,
  SiteMark,
  StatusBadge,
} from "@/src/components/ui";
import {
  activities,
  automations,
  campaigns,
  siteById,
  sites,
} from "@/src/data/mock";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const { site } = await searchParams;
  const visibleSites = site ? sites.filter((s) => s.id === site) : sites;
  const visibleAutomations = automations.filter((a) =>
    visibleSites.some((s) => s.id === a.siteId),
  );
  const visibleActivities = activities.filter((a) =>
    visibleSites.some((s) => s.id === a.siteId),
  );
  return (
    <>
      <PageHeader
        title="Resumen general"
        description="El estado de tus marcas y automatizaciones, de un vistazo."
      />
      <div className="stats">
        <div className="card stat">
          <div className="stat-label">Sitios activos</div>
          <div className="stat-value">{visibleSites.length}</div>
          <div className="stat-foot">Todos operativos</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Automatizaciones activas</div>
          <div className="stat-value">
            {visibleAutomations.filter((a) => a.isEnabled).length}
          </div>
          <div className="stat-foot">
            de {visibleAutomations.length} configuradas
          </div>
        </div>
        <div className="card stat">
          <div className="stat-label">Campañas visibles</div>
          <div className="stat-value">
            {
              campaigns.filter((c) =>
                visibleSites.some((s) => s.id === c.siteId),
              ).length
            }
          </div>
          <div className="stat-foot">Datos del filtro actual</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Próximo envío</div>
          <div className="stat-value" style={{ fontSize: 20 }}>
            15 ago
          </div>
          <div className="stat-foot">10:00 · America/Lima</div>
        </div>
      </div>
      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Estado de los sitios</h2>
        </div>
        <div className="sites-grid">
          {visibleSites.map((s) => (
            <SiteCard key={s.id} site={s} />
          ))}
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Próximas automatizaciones</h2>
        </div>
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Marca</th>
                <th>Automatización</th>
                <th>Frecuencia</th>
                <th>Próxima ejecución</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibleAutomations
                .filter((a) => a.isEnabled)
                .slice(0, 5)
                .map((a) => {
                  const s = siteById(a.siteId)!;
                  return (
                    <tr key={a.id}>
                      <td>
                        <span className="brand-cell">
                          <SiteMark site={s} small />
                          {s.name}
                        </span>
                      </td>
                      <td>{a.name}</td>
                      <td>
                        {a.frequency === "weekly" ? "Semanal" : "Mensual"}
                      </td>
                      <td>{a.nextRunAt}</td>
                      <td>
                        <StatusBadge status="connected" />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Actividad reciente</h2>
        </div>
        <div className="card activity">
          {visibleActivities.slice(0, 4).map((a, i) => (
            <div className="activity-row" key={i}>
              <span className="activity-icon">
                {a.status === "error" ? "!" : "✓"}
              </span>
              <div>
                <strong>{a.operation}</strong>
                <div className="muted">
                  {siteById(a.siteId)?.name} · {a.provider}
                </div>
              </div>
              <span className="muted">{a.date}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
