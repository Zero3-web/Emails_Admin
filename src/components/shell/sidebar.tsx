"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Building2,
  BarChart3,
  ChevronDown,
  Eye,
  Home,
  Layers3,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PlugZap,
  Send,
  Settings2,
  UsersRound,
  Zap,
} from "lucide-react";
import { primaryNavigation, type NavigationItem } from "./navigation";

type UsageData = {
  todayCount: number;
  dailyLimit: number;
  monthCount: number;
  monthlyLimit: number;
};

type SidebarProps = {
  pathname: string;
  open: boolean;
  withSite: (href: string) => string;
  onNavigate: () => void;
  onSignOut: () => void;
  usage?: UsageData;
};

export function Sidebar({ pathname, open, withSite, onNavigate, onSignOut, usage }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const navigationLink = ({ label, href, icon: Icon }: NavigationItem) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={withSite(href)}
        className={`ref-nav-link ${active ? "active" : ""}`}
        onClick={onNavigate}
        title={collapsed ? label : undefined}
      >
        <Icon size={16} strokeWidth={1.9} className="ref-nav-icon" />
        {!collapsed && <span>{label}</span>}
      </Link>
    );
  };

  return (
    <aside className={`ref-sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
      {/* Brand Header without AM logo mark */}
      <div className="ref-brand-row">
        <Link href="/dashboard" className="ref-brand">
          <strong>AREA MAIL</strong>
        </Link>
        <button
          type="button"
          className="ref-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir menú" : "Plegar menú"}
          aria-label={collapsed ? "Expandir menú" : "Plegar menú"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav aria-label="Navegación principal" className="ref-nav-scroll">
        {navigationLink(primaryNavigation[0])}

        <details className="ref-campaign-menu" open={(!collapsed && ["/campaigns", "/automations", "/activity"].some((href) => pathname.startsWith(href))) || undefined}>
          <summary title={collapsed ? "Campañas" : undefined}>
            <span>
              <Send size={16} strokeWidth={1.9} className="ref-nav-icon" />
              {!collapsed && <span>Campañas</span>}
            </span>
            {!collapsed && <ChevronDown size={13} />}
          </summary>
          {!collapsed && (
            <div>
              <Link href={withSite("/campaigns")}><Send size={13} />Campañas</Link>
              <Link href={withSite("/automations")}><Zap size={13} />Automatizaciones</Link>
              <Link href={withSite("/activity")}><BarChart3 size={13} />Actividad de envíos</Link>
            </div>
          )}
        </details>

        {navigationLink(primaryNavigation[1])}

        <details className="ref-campaign-menu" open={(!collapsed && ["/templates", "/properties"].some((href) => pathname.startsWith(href))) || undefined}>
          <summary title={collapsed ? "Campañas" : undefined}>
            <span>
              <Layers3 size={16} strokeWidth={1.9} className="ref-nav-icon" />
              {!collapsed && <span>Contenido</span>}
            </span>
            {!collapsed && <ChevronDown size={13} />}
          </summary>
          {!collapsed && (
            <div>
              <Link href={withSite("/templates")}><Layers3 size={13} />Plantillas</Link>
              <Link href={withSite("/properties")}><Home size={13} />Propiedades</Link>
            </div>
          )}
        </details>

        <details className="ref-campaign-menu ref-settings-menu" open={(!collapsed && ["/settings", "/sites", "/integrations", "/team"].some((href) => pathname.startsWith(href))) || undefined}>
          <summary title={collapsed ? "Configuración" : undefined}>
            <span>
              <Settings2 size={16} strokeWidth={1.9} className="ref-nav-icon" />
              {!collapsed && <span>Configuración</span>}
            </span>
            {!collapsed && <ChevronDown size={13} />}
          </summary>
          {!collapsed && (
            <div>
              <Link href="/sites"><Building2 size={13} />Sitios</Link>
              <Link href="/integrations"><PlugZap size={13} />Integraciones</Link>
              <Link href="/team"><UsersRound size={13} />Equipo y accesos</Link>
              <Link href="/settings"><Settings2 size={13} />Estado del sistema</Link>
            </div>
          )}
        </details>
      </nav>

      {/* Footer Area: Límite de Envíos ABOVE Cerrar Sesión (as requested in audio) */}
      <div className="ref-sidebar-footer">
        <CampaignLimitInline usage={usage} collapsed={collapsed} />

        <button className="ref-logout" onClick={onSignOut} title={collapsed ? "Cerrar sesión" : undefined}>
          <LogOut size={16} strokeWidth={1.9} className="ref-nav-icon" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}

function CampaignLimitInline({ usage, collapsed }: { usage?: UsageData; collapsed: boolean }) {
  const [hidden, setHidden] = useState(false);

  if (collapsed) return null;

  const monthCount = usage?.monthCount ?? 0;
  const monthlyLimit = usage?.monthlyLimit ?? 3000;

  const monthPercent = Math.min(100, Math.round((monthCount / monthlyLimit) * 100));
  const formattedMonthlyLimit = monthlyLimit >= 1000 ? "3,000" : String(monthlyLimit);

  if (hidden) {
    return (
      <div className="ref-limit-restore-wrap">
        <button
          type="button"
          className="ref-limit-restore-btn"
          onClick={() => setHidden(false)}
          title="Ver límites de envíos"
        >
          <Eye size={12} />
          <span>Ver límites de envíos</span>
        </button>
      </div>
    );
  }

  return (
      <div className="ref-limit-inline" suppressHydrationWarning>
      <div className="ref-limit-inline-header">
        <strong>Límite de Envíos</strong>
        <button type="button" onClick={() => setHidden(true)} className="ref-limit-hide-btn" title="Ocultar">
          Ocultar
        </button>
      </div>
      <p><b>{monthCount}/{formattedMonthlyLimit}</b> envíos este mes</p>
      <span className="ref-limit-bar"><i style={{ width: `${Math.max(4, monthPercent)}%` }} /></span>
    </div>
  );
}
