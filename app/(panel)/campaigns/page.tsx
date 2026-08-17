import Link from "next/link";
import { Search } from "lucide-react";
import { CampaignComposer } from "@/src/components/campaign-composer";
import {
  EmptyState,
  PageHeader,
  SiteMark,
  StatusBadge,
} from "@/src/components/ui";
import {
  getBlogPosts,
  getCampaigns,
  getContacts,
  getProperties,
  getSites,
} from "@/src/database/repositories";

const labels = {
  weekly_new_properties: "Nuevas oficinas",
  monthly_properties: "Oficinas mensuales",
  monthly_blog: "Blog mensual",
};

export default async function Campaigns({
  searchParams,
}: {
  searchParams: Promise<{
    site?: string;
    status?: string;
    type?: string;
    q?: string;
    new?: string;
  }>;
}) {
  const filters = await searchParams;
  const [campaigns, sites, properties, posts, contactResult] = await Promise.all([
    getCampaigns(),
    getSites(),
    getProperties(),
    getBlogPosts(),
    getContacts(),
  ]);
  const visibleSites = filters.site
    ? sites.filter((site) => site.id === filters.site)
    : sites;
  const query = (filters.q ?? "").toLowerCase();
  const rows = campaigns.filter(
    (campaign) =>
      visibleSites.some((site) => site.id === campaign.siteId) &&
      (!filters.status || campaign.status === filters.status) &&
      (!filters.type || campaign.automationType === filters.type) &&
      (!query || campaign.name.toLowerCase().includes(query)),
  );
  const siteById = new Map(sites.map((site) => [site.id, site]));
  return (
    <>
      <PageHeader
        eyebrow="Comunicaciones"
        title="Campañas"
        description="Crea borradores con una copia inmutable del contenido que se enviará."
        action={
          <CampaignComposer
            sites={visibleSites}
            properties={properties}
            posts={posts}
            contacts={contactResult.contacts}
            contactsReady={contactResult.ready}
            initialOpen={filters.new === "1"}
          />
        }
      />
      <form className="card toolbar">
        <input type="hidden" name="site" value={filters.site ?? ""} />
        <div className="toolbar-fields">
          <div className="toolbar-search">
            <Search size={15} />
            <input
              name="q"
              aria-label="Buscar campañas"
              defaultValue={filters.q ?? ""}
              placeholder="Buscar campaña…"
            />
          </div>
          <select
            name="type"
            aria-label="Tipo"
            defaultValue={filters.type ?? ""}
          >
            <option value="">Todos los tipos</option>
            <option value="weekly_new_properties">Nuevas oficinas</option>
            <option value="monthly_properties">Oficinas mensuales</option>
            <option value="monthly_blog">Blog mensual</option>
          </select>
          <select
            name="status"
            aria-label="Estado"
            defaultValue={filters.status ?? ""}
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="ready">Lista</option>
            <option value="sent">Enviada</option>
            <option value="failed">Fallida</option>
          </select>
          <button className="btn">Aplicar filtros</button>
        </div>
        <span className="result-count">{rows.length} resultados</span>
      </form>
      {rows.length ? (
        <div className="card table-wrap responsive-table">
          <table>
            <thead>
              <tr>
                <th>Marca</th>
                <th>Campaña</th>
                <th>Tipo</th>
                <th>Contenido</th>
                <th>Destinatarios</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((campaign) => {
                const site = siteById.get(campaign.siteId)!;
                return (
                  <tr key={campaign.id}>
                    <td data-label="Marca">
                      <span className="brand-cell">
                        <SiteMark site={site} small />
                        {site.name}
                      </span>
                    </td>
                    <td data-label="Campaña">
                      <Link href={`/campaigns/${campaign.id}`}>
                        <strong>{campaign.name}</strong>
                      </Link>
                    </td>
                    <td data-label="Tipo">{labels[campaign.automationType]}</td>
                    <td data-label="Contenido">
                      {campaign.metadata?.items?.length ?? 0} elementos
                    </td>
                    <td data-label="Destinatarios">
                      {campaign.recipientCount.toLocaleString("es-PE")}
                    </td>
                    <td data-label="Estado">
                      <StatusBadge status={campaign.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Todavía no hay campañas"
          description="Crea el primer borrador seleccionando contenido real de Área Prime."
        />
      )}
    </>
  );
}
