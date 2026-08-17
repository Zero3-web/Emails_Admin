import Link from "next/link";
import { AutomationsView } from "@/src/components/automations-view";
import { EmptyState, PageHeader } from "@/src/components/ui";
import { getAutomations, getSites } from "@/src/database/repositories";

export default async function Automations({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const { site } = await searchParams;
  const [sites, automations] = await Promise.all([getSites(), getAutomations()]);
  const visibleSites = site ? sites.filter((item) => item.id === site) : sites;
  const visibleAutomations = automations.filter((item) => visibleSites.some((siteItem) => siteItem.id === item.siteId));
  return <><PageHeader eyebrow="Programación" title="Automatizaciones" description="Controla cuándo se genera y prepara cada comunicación real." />{visibleSites.length ? <AutomationsView initial={visibleAutomations} sites={visibleSites} /> : <EmptyState title="No hay sitios configurados" description="Registra un sitio real antes de crear una automatización." action={<Link className="btn primary" href="/sites">Configurar sitios</Link>} />}</>;
}
