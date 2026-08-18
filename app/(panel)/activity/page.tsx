import { PageHeader } from "@/src/components/ui";
import { SentEmailsHistory } from "@/src/components/sent-emails-history";

export default function Activity() {
  return (
    <>
      <PageHeader
        eyebrow="Campañas"
        title="Actividad de envíos"
        description="Revisa el historial y confirma qué ocurrió con cada correo."
      />
      <SentEmailsHistory />
    </>
  );
}
