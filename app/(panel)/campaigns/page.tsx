import Link from "next/link";
import { CampaignComposer } from "@/src/components/campaign-composer";
import { CampaignFilters } from "@/src/components/campaign-filters";
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
  const hasActiveFilters = Boolean(filters.q || filters.type || filters.status);
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
      <CampaignFilters
        initialQuery={filters.q ?? ""}
        initialType={filters.type ?? ""}
        initialStatus={filters.status ?? ""}
        resultCount={rows.length}
      />
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
          title={hasActiveFilters ? "No encontramos campañas" : "Todavía no hay campañas"}
          description={hasActiveFilters ? "Prueba otra búsqueda o limpia los filtros aplicados." : "Crea el primer borrador seleccionando contenido real de Área Prime."}
        />
      )}
    </>
  );
}
