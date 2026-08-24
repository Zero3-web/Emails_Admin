import { PageHeader } from "@/src/components/ui";
import { SentEmailsHistory } from "@/src/components/sent-emails-history";
import { getSites } from "@/src/database/repositories";

export default async function Activity({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const filters = await searchParams;
  const sites = await getSites();
  const initialSite = sites.some((site) => site.id === filters.site) ? filters.site : "all";

  return (
    <>
      <PageHeader
        eyebrow="Campañas"
        title="Actividad de envíos"
        description="Revisa el historial y confirma qué ocurrió con cada correo."
      />
      <SentEmailsHistory initialSite={initialSite} />
    </>
  );
}
