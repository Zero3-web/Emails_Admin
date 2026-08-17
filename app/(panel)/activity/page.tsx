import { PageHeader } from "@/src/components/ui";
import { SentEmailsHistory } from "@/src/components/sent-emails-history";

export default function Activity() {
  return (
    <>
      <PageHeader
        eyebrow="Historial y Auditoría"
        title="Correos Enviados y Actividad"
        description="Consulta y filtra por fechas todos los correos enviados, verificando su estado real de entrega con Resend."
      />
      <SentEmailsHistory />
    </>
  );
}
