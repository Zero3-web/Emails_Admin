"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  Activity,
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
  const router = useRouter();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const campaignsActive = ["/campaigns", "/automations", "/activity"].some(isActive);
  const settingsActive = ["/settings", "/sites", "/integrations", "/team", "/templates", "/properties"].some(isActive);

  const subLink = (href: string, label: string, icon: React.ReactNode, scoped = true) => {
    const active = isActive(href);
    return (
      <Link
        href={scoped ? withSite(href) : href}
        className={active ? "active" : undefined}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
      >
        {icon}{label}
      </Link>
    );
  };

  const navigationLink = ({ label, href, icon: Icon }: NavigationItem) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={withSite(href)}
        className={`ref-nav-link ${active ? "active" : ""}`}
        aria-current={active ? "page" : undefined}
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
        <Link href={withSite("/dashboard")} className="ref-brand" onClick={onNavigate}>
          <strong>AREA MAIL</strong>
        </Link>
        <button
          type="button"
          className="ref-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir menú" : "Plegar menú"}
          aria-label={collapsed ? "Expandir menú" : "Plegar menú"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav aria-label="Navegación principal" className="ref-nav-scroll">
        {navigationLink(primaryNavigation[0])}

        <details className={`ref-campaign-menu ${campaignsActive ? "active" : ""}`} open={(!collapsed && campaignsActive) || undefined}>
          <summary 
            title={collapsed ? "Campañas" : undefined}
            onClick={() => {
              router.push(withSite("/campaigns"));
            }}
          >
            <span>
              <Send size={16} strokeWidth={1.9} className="ref-nav-icon" />
              {!collapsed && <span>Campañas</span>}
            </span>
            {!collapsed && <ChevronDown size={13} />}
          </summary>
          {!collapsed && (
            <div>
              {subLink("/automations", "Automatizaciones", <Zap size={14} strokeWidth={1.5} />)}
              {subLink("/activity", "Actividad de envíos", <Activity size={14} strokeWidth={1.5} />)}
            </div>
          )}
        </details>

        {navigationLink(primaryNavigation[1])}

        <details className={`ref-campaign-menu ref-settings-menu ${settingsActive ? "active" : ""}`} open={(!collapsed && settingsActive) || undefined}>
          <summary title={collapsed ? "Configuración" : undefined}>
            <span>
              <Settings2 size={16} strokeWidth={1.9} className="ref-nav-icon" />
              {!collapsed && <span>Configuración</span>}
            </span>
            {!collapsed && <ChevronDown size={13} />}
          </summary>
          {!collapsed && (
            <div>
              {subLink("/templates", "Plantillas", <Layers3 size={14} strokeWidth={1.5} />)}
              {subLink("/properties", "Propiedades", <Home size={14} strokeWidth={1.5} />)}
              {subLink("/sites", "Marcas", <Building2 size={14} strokeWidth={1.5} />, false)}
              {subLink("/integrations", "Integraciones", <PlugZap size={14} strokeWidth={1.5} />, false)}
              {subLink("/team", "Equipo y accesos", <UsersRound size={14} strokeWidth={1.5} />, false)}
              {subLink("/settings", "Estado del sistema", <Settings2 size={14} strokeWidth={1.5} />, false)}
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

  const monthCount = usage?.monthCount ?? 1;
  const monthlyLimit = usage?.monthlyLimit ?? 3000;

  const monthPercent = Math.min(100, Math.round((monthCount / monthlyLimit) * 100));
  const formattedMonthlyLimit = monthlyLimit >= 1000 ? "3,000" : String(monthlyLimit);

  // Dynamic progress bar color based on usage percentage requested in audio:
  // - 0% - 35%: Plomo / Gray (#94a3b8)
  // - 35% - 75%: Verde (#10b981)
  // - 75% - 90%: Anaranjado (#f97316)
  // - 90%+: Rojo (#ef4444)
  const progressColor =
    monthPercent >= 90
      ? "#ef4444"
      : monthPercent >= 75
      ? "#f97316"
      : monthPercent >= 35
      ? "#10b981"
      : "#94a3b8";

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
      </div>
      <p><b>{monthCount}/{formattedMonthlyLimit}</b> envíos este mes</p>
      <span className="ref-limit-bar">
        <i style={{ width: `${Math.max(4, monthPercent)}%`, backgroundColor: progressColor }} />
      </span>
    </div>
  );
}
