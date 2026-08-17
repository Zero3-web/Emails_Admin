import {
  Activity,
  Building2,
  Circle,
  ContactRound,
  FileStack,
  Gauge,
  PlugZap,
  RotateCw,
  Send,
  Settings2,
  type LucideIcon,
} from "lucide-react";

export function Icon({ name }: { name: string }) {
  const icons: Record<string, LucideIcon> = {
    Dashboard: Gauge,
    Sitios: Building2,
    Automatizaciones: RotateCw,
    Campañas: Send,
    Plantillas: FileStack,
    Integraciones: PlugZap,
    Actividad: Activity,
    Configuración: Settings2,
    Contactos: ContactRound,
  };
  const Glyph = icons[name] ?? Circle;
  return <Glyph aria-hidden="true" size={17} strokeWidth={1.8} />;
}
