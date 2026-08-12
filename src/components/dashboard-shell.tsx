"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Icon } from "./icons";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Sitios", "/sites"],
  ["Automatizaciones", "/automations"],
  ["Campañas", "/campaigns"],
  ["Plantillas", "/templates"],
  ["Integraciones", "/integrations"],
  ["Contactos", "/contacts"],
  ["Actividad", "/activity"],
  ["Configuración", "/settings"],
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const selected = params.get("site") ?? "all";
  const changeSite = (site: string) => {
    const next = new URLSearchParams(params.toString());
    if (site === "all") next.delete("site");
    else next.set("site", site);
    router.push(`${path}${next.size ? `?${next}` : ""}`);
  };
  const sidebar = (
    <>
      <Link href="/dashboard" className="brand">
        <span className="brand-mark">AM</span>
        <span>Area Mail</span>
      </Link>
      <nav className="nav">
        {nav.map(([label, href]) => (
          <Link
            onClick={() => setOpen(false)}
            key={href}
            href={`${href}${selected !== "all" ? `?site=${selected}` : ""}`}
            className={`nav-link ${path === href || path.startsWith(href + "/") ? "active" : ""}`}
          >
            <Icon name={label} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="user">
          <span className="avatar">AD</span>
          <div>
            <strong>Administrador</strong>
            <br />
            <span className="muted">Acceso privado</span>
          </div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="nav-link logout-button">
            <span>↪</span>
            <span>Cerrar sesión</span>
          </button>
        </form>
      </div>
    </>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">{sidebar}</aside>
      {open && (
        <div className="mobile-overlay">
          <button
            className="mobile-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="mobile-drawer">
            <button
              className="icon-btn drawer-close"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
            <span className="topbar-title">Panel de automatización</span>
          </div>
          <select
            className="site-picker"
            aria-label="Filtrar por sitio"
            value={selected}
            onChange={(event) => changeSite(event.target.value)}
          >
            <option value="all">Todos los sitios</option>
            <option value="prime">Area Prime</option>
            <option value="retail">Area Retail</option>
            <option value="hub">Area Hub</option>
          </select>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
