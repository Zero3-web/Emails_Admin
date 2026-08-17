import { notFound } from "next/navigation";
import { PageHeader } from "@/src/components/ui";
import { SiteForm } from "@/src/components/site-form";
import { SiteIntegrations } from "@/src/components/site-integrations";
import { getIntegrations, getSites } from "@/src/database/repositories";

export default async function SiteDetail({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const [sites, integrations] = await Promise.all([
    getSites(),
    getIntegrations(),
  ]);
  const site = sites.find((item) => item.id === siteId);
  if (!site) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Configuración del sitio"
        title={site.name}
        description={site.description}
      />
      <div className="settings-grid">
        <SiteForm site={site} />
        <SiteIntegrations
          siteId={site.id}
          tokko={integrations.find(
            (item) => item.siteId === site.id && item.provider === "tokko",
          )}
          wordpress={integrations.find(
            (item) => item.siteId === site.id && item.provider === "wordpress",
          )}
          resendReady={Boolean(process.env.RESEND_API_KEY)}
        />
      </div>
    </>
  );
}
