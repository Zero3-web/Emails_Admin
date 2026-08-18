"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

export default function PanelError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="panel-state-card" role="alert">
      <span className="panel-state-icon error"><AlertCircle size={22} /></span>
      <small>No pudimos cargar esta sección</small>
      <h1>Algo interrumpió la vista</h1>
      <p>Tu información permanece intacta. Puedes intentar cargar nuevamente o volver al resumen.</p>
      <div>
        <button className="btn primary" type="button" onClick={reset}><RefreshCw size={14} />Reintentar</button>
        <Link className="btn" href="/dashboard"><ArrowLeft size={14} />Volver al resumen</Link>
      </div>
    </section>
  );
}
