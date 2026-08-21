import { PageHeader } from "@/src/components/ui";
import { AnalyticsView } from "@/src/components/analytics-view";
import {
  getCampaigns,
  getContacts,
  getOutboundEmails,
  getResendUsage,
  getSites,
} from "@/src/database/repositories";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const { site } = await searchParams;

  const [sites, campaigns, contactResult, outboundEmails, usage] = await Promise.all([
    getSites(),
    getCampaigns(),
    getContacts(),
    getOutboundEmails(),
    getResendUsage(),
  ]);

  return (
    <div className="analytics-page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        eyebrow="Reportes"
        title="Analíticas y Rendimiento"
        description="Monitorea el volumen de envíos, tasa de entrega y comportamiento de la audiencia."
      />

      <AnalyticsView
        sites={sites}
        campaigns={campaigns}
        contacts={contactResult.contacts}
        outboundEmails={outboundEmails}
        usage={usage}
        initialSiteId={site ?? "all"}
      />
    </div>
  );
}
