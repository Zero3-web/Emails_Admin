import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { ContentLibraryNav } from "@/src/components/content-library-nav";
import { PropertiesView } from "@/src/components/properties-view";
import { PageHeader } from "@/src/components/ui";
import { getProperties, getSites } from "@/src/database/repositories";

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const filters = await searchParams;
  const [properties, sites] = await Promise.all([getProperties(), getSites()]);
  const initialSiteId = sites.some((site) => site.id === filters.site) ? filters.site : "";

  return <>
    <PageHeader eyebrow="Contenido" title="Propiedades" description="Explora y valida el inventario disponible para tus campañas." action={<Link className="btn" href={initialSiteId ? `/sites/${initialSiteId}` : "/sites"}><SlidersHorizontal size={15} />Sincronización</Link>} />
    <ContentLibraryNav current="properties" />
    <PropertiesView properties={properties} sites={sites} initialSiteId={initialSiteId} />
  </>;
}
