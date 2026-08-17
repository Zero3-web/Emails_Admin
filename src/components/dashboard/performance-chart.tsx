import { BarChart3 } from "lucide-react";
import type { Campaign } from "@/src/domain/types";

const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function PerformanceChart({ campaigns }: { campaigns: Campaign[] }) {
  const counts = months.map((_, index) => campaigns.filter((campaign) => {
    const date = campaign.sentAt ? new Date(campaign.sentAt) : null;
    return date && !Number.isNaN(date.getTime()) && date.getMonth() === index;
  }).length);
  const maximum = Math.max(...counts, 0);

  return (
    <section className="up-card up-performance dashboard-performance">
      <header><div><strong>Actividad de envíos</strong><span>Campañas enviadas durante el año</span></div><span className="up-chart-period">Últimos 12 meses</span></header>
      {maximum === 0 ? (
        <div className="up-chart-empty dashboard-chart-empty"><span><BarChart3 size={19} /></span><div><strong>Aún no hay campañas enviadas</strong><small>La evolución mensual aparecerá después de tu primer envío.</small></div></div>
      ) : (
        <div className="up-chart" role="img" aria-label="Campañas enviadas por mes">
          <div className="up-y"><span>{maximum}</span><span>{Math.ceil(maximum / 2)}</span><span>0</span></div>
          <div className="up-bars">
            {counts.map((count, index) => <div className="up-bar-column" key={months[index]}><div className="up-stack"><i style={{ height: `${Math.max(4, (count / maximum) * 100)}%` }} /></div><small>{months[index]}</small></div>)}
          </div>
        </div>
      )}
    </section>
  );
}
