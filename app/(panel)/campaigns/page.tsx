import { CampaignComposer } from "@/src/components/campaign-composer";
import { CampaignsView } from "@/src/components/campaigns-view";
import { PageHeader } from "@/src/components/ui";
import { requirePanelAccess } from "@/src/auth/server";
import {
  getBlogPosts,
  getCampaigns,
  getContacts,
  getProperties,
  getSites,
} from "@/src/database/repositories";

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
  const [filters, campaigns, sites, properties, posts, contactResult, access] = await Promise.all([
    searchParams,
    getCampaigns(),
    getSites(),
    getProperties(),
    getBlogPosts(),
    getContacts(),
    requirePanelAccess(),
  ]);

  const visibleSites = filters.site
    ? sites.filter((site) => site.id === filters.site)
    : sites;

  const canApprove = access.platformOwner || access.memberships.some((m) => m.role === "site_admin" || m.role === "approver");

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
      <CampaignsView
        campaigns={campaigns}
        sites={sites}
        canApprove={canApprove}
        initialQuery={filters.q ?? ""}
        initialType={filters.type ?? ""}
        initialStatus={filters.status ?? ""}
        initialSite={filters.site ?? ""}
      />
    </>
  );
}
