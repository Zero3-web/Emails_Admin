import Link from "next/link";
import { AutomationsView } from "@/src/components/automations-view";
import { EmptyState, PageHeader } from "@/src/components/ui";
import { getAutomations, getContacts, getSites } from "@/src/database/repositories";

export default async function Automations({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const { site } = await searchParams;
  const [sites, automations, contactResult] = await Promise.all([
    getSites(),
    getAutomations(),
    getContacts(),
  ]);
  const visibleSites = site ? sites.filter((item) => item.id === site) : sites;
  const visibleAutomations = automations.filter((item) => visibleSites.some((siteItem) => siteItem.id === item.siteId));
  return (
    <>
      <PageHeader
        eyebrow="Campañas"
        title="Automatizaciones"
        description="Programa la preparación de contenido sin perder la aprobación antes del envío."
      />
      {sites.length ? (
        <AutomationsView
          initial={automations}
          sites={sites}
          initialSiteId={site}
          contacts={contactResult.contacts}
        />
      ) : (
        <EmptyState
          title="No hay marcas configuradas"
          description="Registra una marca antes de crear una automatización."
          action={<Link className="btn primary" href="/sites">Configurar marcas</Link>}
        />
      )}
    </>
  );
}

