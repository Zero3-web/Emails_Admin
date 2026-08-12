export function Icon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    Dashboard: "⌂",
    Sitios: "◇",
    Automatizaciones: "↻",
    Campañas: "✉",
    Plantillas: "▤",
    Integraciones: "⌁",
    Actividad: "◷",
    Configuración: "⚙",
    Contactos: "♙",
  };
  return (
    <span
      aria-hidden="true"
      style={{ width: 18, textAlign: "center", fontSize: 16 }}
    >
      {icons[name] ?? "·"}
    </span>
  );
}
