import { PageHeader, SiteMark, StatusBadge } from "@/src/components/ui";
import { activities, siteById } from "@/src/data/mock";
export default async function Activity({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const { site } = await searchParams;
  const rows = site ? activities.filter((a) => a.siteId === site) : activities;
  return (
    <>
      <PageHeader
        eyebrow="Auditoría"
        title="Actividad"
        description="Historial de sincronizaciones, envíos y errores del sistema."
      />
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Marca</th>
              <th>Proveedor</th>
              <th>Operación</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => {
              const s = siteById(a.siteId)!;
              return (
                <tr key={i}>
                  <td>{a.date}</td>
                  <td>
                    <span className="brand-cell">
                      <SiteMark site={s} small />
                      {s.name}
                    </span>
                  </td>
                  <td>{a.provider}</td>
                  <td>{a.operation}</td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
