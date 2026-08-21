import {
  BarChart3,
  LayoutDashboard,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const primaryNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analíticas", href: "/analytics", icon: BarChart3 },
  { label: "Audiencia", href: "/contacts", icon: UsersRound },
];

export const pageMetadata: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Vista general de tus campañas" },
  "/analytics": { title: "Analíticas", subtitle: "Métricas de rendimiento, entregabilidad y efectividad" },
  "/activity": { title: "Actividad", subtitle: "Correos enviados y actividad reciente" },
  "/templates": { title: "Plantillas", subtitle: "Diseños de correo disponibles" },
  "/contacts": { title: "Audiencia", subtitle: "Contactos, segmentos y suscripciones" },
  "/campaigns": { title: "Campañas", subtitle: "Crea, revisa y envía campañas" },
  "/automations": { title: "Automatizaciones", subtitle: "Programa tus comunicaciones" },
  "/properties": { title: "Propiedades", subtitle: "Contenido inmobiliario sincronizado" },
  "/sites": { title: "Marcas", subtitle: "Identidad, contenido y presencia digital" },
  "/integrations": { title: "Integraciones", subtitle: "Conexiones con servicios externos" },
  "/team": { title: "Equipo", subtitle: "Personas, roles y accesos" },
  "/settings": { title: "Configuración", subtitle: "Preferencias y estado del sistema" },
};

export function getPageMetadata(pathname: string) {
  return (
    Object.entries(pageMetadata).find(([href]) => pathname.startsWith(href))?.[1] ?? {
      title: "Area Mail",
      subtitle: "Administración de comunicaciones",
    }
  );
}
