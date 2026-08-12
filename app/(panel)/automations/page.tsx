import { PageHeader } from "@/src/components/ui";
import { AutomationsView } from "@/src/components/automations-view";
import { TaskButton } from "@/src/components/task-button";
import { automations, sites } from "@/src/data/mock";
export default async function Automations({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const { site } = await searchParams;
  const visibleSites = site ? sites.filter((s) => s.id === site) : sites;
  return (
    <>
      <PageHeader
        eyebrow="Programación"
        title="Automatizaciones"
        description="Controla cuándo se genera y prepara cada comunicación."
        action={
          <TaskButton
            name="generate-weekly-properties"
            label="Generar campaña mock"
          />
        }
      />
      <AutomationsView
        initial={automations.filter((a) =>
          visibleSites.some((s) => s.id === a.siteId),
        )}
        sites={visibleSites}
      />
    </>
  );
}
