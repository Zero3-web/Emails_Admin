import { BrandsView } from "@/src/components/brands-view";
import { PageHeader } from "@/src/components/ui";
import { getContacts, getIntegrations, getProperties, getSites } from "@/src/database/repositories";

export default async function Sites() {
  const [sites, integrations, properties, contactResult] = await Promise.all([getSites(), getIntegrations(), getProperties(), getContacts()]);
  const propertyCounts = Object.fromEntries(sites.map((site) => [site.id, properties.filter((property) => property.siteId === site.id).length]));
  const contactCounts = Object.fromEntries(sites.map((site) => [site.id, contactResult.contacts.filter((contact) => contact.siteIds.includes(site.id)).length]));
  return <><PageHeader eyebrow="Configuración" title="Marcas" description="Administra la identidad, el contenido y las conexiones de cada marca."/><BrandsView sites={sites} integrations={integrations} propertyCounts={propertyCounts} contactCounts={contactCounts}/></>;
}
