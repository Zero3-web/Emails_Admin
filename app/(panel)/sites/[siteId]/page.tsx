import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/src/components/ui";
import { SiteForm } from "@/src/components/site-form";
import { SiteIntegrations } from "@/src/components/site-integrations";
import { getIntegrations, getSites } from "@/src/database/repositories";
import { requirePanelAccess } from "@/src/auth/server";

export default async function SiteDetail({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const access = await requirePanelAccess();
  const [sites, integrations] = await Promise.all([
    getSites(),
    getIntegrations(),
  ]);
  const site = sites.find((item) => item.id === siteId);
  if (!site) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Configuración de marca"
        title={site.name}
        description={site.description || "Configura la identidad, el remitente y las fuentes de contenido de esta marca."}
        action={<Link className="btn" href="/sites"><ArrowLeft size={13}/>Volver a marcas</Link>}
      />
      <div className={access.platformOwner ? "settings-grid" : "settings-grid-single"}>
        <SiteForm site={site} />
        {access.platformOwner && (
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
        )}
      </div>
    </>
  );
}
