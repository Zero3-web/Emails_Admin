import { PageHeader } from "@/src/components/ui";
import { SettingsView } from "@/src/components/settings-view";
import { getAccessOverview, getContacts } from "@/src/database/repositories";
import { getRuntimeSafety } from "@/src/config/runtime";
import { requirePanelAccess } from "@/src/auth/server";
import { redirect } from "next/navigation";

export default async function Settings() {
  if (!(await requirePanelAccess()).platformOwner) redirect("/no-access");
  const [contacts, access] = await Promise.all([getContacts(), getAccessOverview()]);
  const runtime = getRuntimeSafety();
  const emailSendingReady = Boolean(process.env.RESEND_API_KEY);
  const emailTrackingReady = Boolean(process.env.RESEND_WEBHOOK_SECRET);
  const checks = [
    { label: "Base de datos", detail: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "Conectada y disponible" : "Requiere completar la conexión", ready: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY), icon: "database" as const },
    { label: "Audiencias", detail: contacts.ready ? "Contactos y consentimientos listos" : "Falta preparar el almacenamiento de contactos", ready: contacts.ready, icon: "database" as const },
    { label: "Permisos de equipo", detail: access.ready ? "Roles y acceso por marca activos" : "Falta activar el control por roles", ready: access.ready, icon: "database" as const },
    { label: "Propiedades", detail: process.env.TOKKO_API_KEY ? "Sincronización disponible" : "Requiere conectar Tokko Broker", ready: Boolean(process.env.TOKKO_API_KEY), icon: "source" as const },
    { label: "Entrega de correos", detail: !emailSendingReady ? "Requiere conectar el servicio de correo" : emailTrackingReady ? "Envío y seguimiento de eventos configurados" : "Los envíos funcionan, pero falta configurar el seguimiento por webhook", ready: emailSendingReady && emailTrackingReady, icon: "mail" as const },
    { label: "Artículos", detail: "Sincronización disponible por marca", ready: true, icon: "source" as const },
    { label: "Envíos programados", detail: "Pendiente para activar automatizaciones", ready: false, icon: "runtime" as const },
  ];
  return <><PageHeader eyebrow="Configuración" title="Estado del sistema" description="Comprueba si la plataforma está preparada para operar con seguridad." /><SettingsView checks={checks} bulkSendingEnabled={runtime.bulkSendingEnabled}/></>;
}
