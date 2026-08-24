import { EmptyState, PageHeader } from "@/src/components/ui";
import { TemplatesView } from "@/src/components/templates-view";
import { ContentLibraryNav } from "@/src/components/content-library-nav";
import {
  getBlogPosts,
  getProperties,
  getSites,
} from "@/src/database/repositories";
import { requirePanelAccess } from "@/src/auth/server";
import { redirect } from "next/navigation";

export default async function Templates({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const access = await requirePanelAccess();
  if (!access.platformOwner) redirect("/dashboard");
  const filters = await searchParams;
  const [sites, properties, posts] = await Promise.all([
    getSites(),
    getProperties(),
    getBlogPosts(),
  ]);
  const eligibleSites = sites.filter(
    (site) =>
      properties.some(
        (property) =>
          property.siteId === site.id && Boolean(property.publicUrl),
      ) || posts.some((post) => post.siteId === site.id),
  );
  const initialSiteId = eligibleSites.some((site) => site.id === filters.site)
    ? filters.site!
    : eligibleSites[0]?.id;
  const propertyCounts = Object.fromEntries(
    eligibleSites.map((site) => [
      site.id,
      properties.filter(
        (property) =>
          property.siteId === site.id && Boolean(property.publicUrl),
      ).length,
    ]),
  );
  const blogCounts = Object.fromEntries(
    eligibleSites.map((site) => [
      site.id,
      posts.filter((post) => post.siteId === site.id).length,
    ]),
  );
  return (
    <>
      <PageHeader
        eyebrow="Contenido"
        title="Plantillas de email"
        description="Previsualiza correos con propiedades, artículos, branding y enlaces públicos reales."
      />
      <ContentLibraryNav current="templates" />
      {initialSiteId ? (
        <TemplatesView
          sites={eligibleSites}
          initialSiteId={initialSiteId}
          propertyCounts={propertyCounts}
          blogCounts={blogCounts}
        />
      ) : (
        <EmptyState
          title="No hay contenido apto para una plantilla"
          description="Sincroniza Tokko o WordPress para comenzar."
        />
      )}
    </>
  );
}
