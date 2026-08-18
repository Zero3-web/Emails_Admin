import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function PanelNotFound() {
  return (
    <section className="panel-state-card">
      <span className="panel-state-icon"><SearchX size={22} /></span>
      <small>Contenido no disponible</small>
      <h1>No encontramos este registro</h1>
      <p>Es posible que haya sido eliminado, que el enlace haya cambiado o que no tengas acceso a esta marca.</p>
      <div><Link className="btn primary" href="/dashboard"><ArrowLeft size={14} />Volver al resumen</Link></div>
    </section>
  );
}
