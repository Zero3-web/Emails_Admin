import Link from "next/link";
import { Building2, LayoutTemplate } from "lucide-react";

export function ContentLibraryNav({ current }: { current: "properties" | "templates" }) {
  return (
    <nav className="content-library-nav" aria-label="Biblioteca de contenido">
      <Link className={current === "properties" ? "active" : ""} href="/properties">
        <Building2 size={15} />
        <span><strong>Propiedades</strong><small>Inventario sincronizado</small></span>
      </Link>
      <Link className={current === "templates" ? "active" : ""} href="/templates">
        <LayoutTemplate size={15} />
        <span><strong>Plantillas</strong><small>Diseños de correo</small></span>
      </Link>
    </nav>
  );
}
