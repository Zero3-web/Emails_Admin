"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  Activity,
  Building2,
  ChevronDown,
  Home,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  Moon,
  PlugZap,
  Send,
  Settings2,
  UsersRound,
  X,
  Zap,
} from "lucide-react";

import type { Site } from "@/src/domain/types";
import { getSiteInitials } from "@/src/components/ui";
import { getPageMetadata } from "@/src/components/shell/navigation";

type MobileChromeProps = {
  pathname: string;
  sites: Site[];
  selectedSite: string;
  userInitial: string;
  moreOpen: boolean;
  withSite: (href: string) => string;
  onMoreChange: (open: boolean) => void;
  onSiteChange: (siteId: string) => void;
  onSignOut: () => void;
};

const mainTabs = [
  { label: "Inicio", href: "/dashboard", icon: LayoutDashboard },
  { label: "Campañas", href: "/campaigns", icon: Send },
  { label: "Audiencia", href: "/contacts", icon: UsersRound },
  { label: "Actividad", href: "/activity", icon: Activity },
];

const moreLinks = [
  { label: "Automatizaciones", caption: "Flujos y programación", href: "/automations", icon: Zap },
  { label: "Plantillas", caption: "Diseños de correo", href: "/templates", icon: Layers3 },
  { label: "Propiedades", caption: "Catálogo sincronizado", href: "/properties", icon: Home },
  { label: "Marcas", caption: "Identidad y sitios", href: "/sites", icon: Building2 },
  { label: "Integraciones", caption: "Servicios conectados", href: "/integrations", icon: PlugZap },
  { label: "Equipo", caption: "Personas y accesos", href: "/team", icon: UsersRound },
  { label: "Configuración", caption: "Preferencias del sistema", href: "/settings", icon: Settings2 },
];

export function MobileChrome(props: MobileChromeProps) {
  const { pathname, sites, selectedSite, userInitial, moreOpen, withSite, onMoreChange, onSiteChange, onSignOut } = props;
  const siteMenu = useRef<HTMLDetailsElement>(null);
  const currentSite = sites.find((site) => site.id === selectedSite);
  const metadata = getPageMetadata(pathname);
  const inMore = moreLinks.some((item) => pathname.startsWith(item.href));

  useEffect(() => {
    onMoreChange(false);
  }, [pathname, onMoreChange]);

  useEffect(() => {
    document.body.classList.toggle("mobile-sheet-open", moreOpen);
    return () => document.body.classList.remove("mobile-sheet-open");
  }, [moreOpen]);

  const toggleTheme = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("area-mail-theme", next); } catch { /* device storage may be unavailable */ }
  };

  const chooseSite = (siteId: string) => {
    onSiteChange(siteId);
    siteMenu.current?.removeAttribute("open");
  };

  return (
    <>
      <header className="mobile-header">
        <div className="mobile-header-topline">
          <details className="mobile-brand-switcher" ref={siteMenu}>
            <summary aria-label="Cambiar marca">
              <span className="mobile-brand-mark" style={currentSite ? { backgroundColor: currentSite.primaryColor } : undefined}>
                {currentSite ? getSiteInitials(currentSite.name) : userInitial}
              </span>
              <span><small>AREA MAIL</small><strong>{currentSite?.name ?? "Todas las marcas"}</strong></span>
              <ChevronDown size={15} />
            </summary>
            <div className="mobile-brand-popover">
              <button type="button" className={selectedSite === "all" ? "selected" : ""} onClick={() => chooseSite("all")}>Todas las marcas</button>
              {sites.map((site) => <button type="button" key={site.id} className={selectedSite === site.id ? "selected" : ""} onClick={() => chooseSite(site.id)}>{site.name}</button>)}
            </div>
          </details>
          <button type="button" className="mobile-theme-button" onClick={toggleTheme} aria-label="Cambiar tema"><Moon size={18} /></button>
        </div>
        <div className="mobile-page-title"><h1>{metadata.title}</h1><p>{metadata.subtitle}</p></div>
      </header>

      <nav className="mobile-tabbar" aria-label="Navegación móvil">
        {mainTabs.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={withSite(href)} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><Icon size={20} /><span>{label}</span></Link>;
        })}
        <button type="button" className={moreOpen || inMore ? "active" : ""} onClick={() => onMoreChange(!moreOpen)} aria-expanded={moreOpen}><Menu size={21} /><span>Más</span></button>
      </nav>

      {moreOpen && <button type="button" className="mobile-sheet-backdrop" aria-label="Cerrar menú" onClick={() => onMoreChange(false)} />}
      <aside className={`mobile-more-sheet ${moreOpen ? "open" : ""}`} aria-hidden={!moreOpen}>
        <div className="mobile-sheet-handle" />
        <header><div><small>AREA MAIL</small><h2>Más herramientas</h2></div><button type="button" onClick={() => onMoreChange(false)} aria-label="Cerrar"><X size={20} /></button></header>
        <div className="mobile-more-grid">
          {moreLinks.map(({ label, caption, href, icon: Icon }) => <Link key={href} href={withSite(href)}><span><Icon size={19} /></span><div><strong>{label}</strong><small>{caption}</small></div></Link>)}
        </div>
        <button type="button" className="mobile-signout" onClick={onSignOut}><LogOut size={18} />Cerrar sesión</button>
      </aside>
    </>
  );
}
