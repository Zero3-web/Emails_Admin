import Link from "next/link";
import { PageHeader, SiteMark, StatusBadge } from "@/src/components/ui";
import { campaigns, siteById } from "@/src/data/mock";
const labels = {
  weekly_new_properties: "Nuevas propiedades",
  monthly_properties: "Catálogo mensual",
  monthly_blog: "Blog mensual",
};
export default async function Campaigns({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; status?: string; type?: string }>;
}) {
  const filters = await searchParams;
  const rows = campaigns.filter(
    (c) =>
      (!filters.site || c.siteId === filters.site) &&
      (!filters.status || c.status === filters.status) &&
      (!filters.type || c.automationType === filters.type),
  );
  return (
    <>
      <PageHeader
        eyebrow="Historial de envíos"
        title="Campañas"
        description="Consulta, prepara y revisa todas las comunicaciones."
      />
      <form
        className="card form-card"
        style={{ marginBottom: 16, padding: 14 }}
      >
        <input type="hidden" name="site" value={filters.site ?? ""} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            name="type"
            aria-label="Tipo"
            defaultValue={filters.type ?? ""}
          >
            <option value="">Todos los tipos</option>
            <option value="weekly_new_properties">Nuevas propiedades</option>
            <option value="monthly_properties">Catálogo mensual</option>
            <option value="monthly_blog">Blog mensual</option>
          </select>
          <select
            name="status"
            aria-label="Estado"
            defaultValue={filters.status ?? ""}
          >
            <option value="">Todos los estados</option>
            <option value="sent">Enviada</option>
            <option value="scheduled">Programada</option>
            <option value="draft">Borrador</option>
            <option value="failed">Fallida</option>
          </select>
          <button className="btn">Aplicar filtros</button>
        </div>
      </form>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Marca</th>
              <th>Campaña</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Destinatarios</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const s = siteById(c.siteId)!;
              return (
                <tr key={c.id}>
                  <td>
                    <span className="brand-cell">
                      <SiteMark site={s} small />
                      {s.name}
                    </span>
                  </td>
                  <td>
                    <Link href={`/campaigns/${c.id}`}>
                      <strong>{c.name}</strong>
                    </Link>
                  </td>
                  <td>{labels[c.automationType]}</td>
                  <td>{c.sentAt ?? c.scheduledAt ?? "—"}</td>
                  <td>{c.recipientCount.toLocaleString("es-PE")}</td>
                  <td>
                    <StatusBadge status={c.status} />
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
