import { PageHeader, SiteCard } from "@/src/components/ui"; import { sites } from "@/src/data/mock";
export default function Sites(){return <><PageHeader eyebrow="Administración" title="Sitios" description="Configura la identidad, dominios e integraciones de cada marca."/><div className="sites-grid">{sites.map(s=><SiteCard key={s.id} site={s}/>)}</div></>}
