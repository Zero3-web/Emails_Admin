import { PageHeader, SiteCard } from "@/src/components/ui";
import { SiteCreateForm } from "@/src/components/site-create-form";
import { getSites } from "@/src/database/repositories";
export default async function Sites() { const sites = await getSites(); return <><PageHeader eyebrow="Administración" title="Sitios" description="Identidad, dominios e integraciones persistidos por marca." />{sites.length ? <div className="sites-grid">{sites.map((site) => <SiteCard key={site.id} site={site} />)}</div> : <SiteCreateForm />}</>; }
