"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2,
  Activity,
  ChevronDown,
  ChevronUp,
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
  bySite?: Record<string, { todayCount: number; dailyLimit: number; monthCount: number; monthlyLimit: number }>;
};

type SidebarProps = {
  pathname: string;
  open: boolean;
  withSite: (href: string) => string;
  onNavigate: () => void;
  onSignOut: () => void;
  usage?: UsageData;
  selectedSite?: string;
  platformOwner?: boolean;
};

export function Sidebar({ pathname, open, withSite, onNavigate, onSignOut, usage, selectedSite = "all" }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const campaignsActive = ["/campaigns", "/automations", "/activity", "/analytics"].some(isActive);
  const settingsActive = ["/sites", "/templates", "/properties"].some(isActive);

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
        {navigationLink(primaryNavigation[1])}

        <details className={`ref-campaign-menu ${campaignsActive ? "active" : ""}`} open={(!collapsed && campaignsActive) || undefined}>
          <summary title={collapsed ? "Campañas" : undefined}>
            <span>
              <Send size={16} strokeWidth={1.9} className="ref-nav-icon" />
              {!collapsed && <span>Campañas</span>}
            </span>
            {!collapsed && <ChevronDown size={13} />}
          </summary>
          {!collapsed && (
            <div>
              {subLink("/campaigns", "Campañas", <Send size={14} strokeWidth={1.5} />)}
              {subLink("/automations", "Automatizaciones", <Zap size={14} strokeWidth={1.5} />)}
              {subLink("/activity", "Actividad de envíos", <Activity size={14} strokeWidth={1.5} />)}
            </div>
          )}
        </details>

        {navigationLink(primaryNavigation[2])}

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
              {subLink("/sites", "Marcas", <Building2 size={14} strokeWidth={1.5} />, false)}
              {subLink("/templates", "Plantillas", <Layers3 size={14} strokeWidth={1.5} />)}
              {subLink("/properties", "Propiedades", <Home size={14} strokeWidth={1.5} />)}
            </div>
          )}
        </details>
      </nav>

      {/* Footer Area: Límite de Envíos ABOVE Cerrar Sesión (as requested in audio) */}
      <div className="ref-sidebar-footer">
        <CampaignLimitInline usage={selectedSite === "all" ? usage : usage?.bySite?.[selectedSite]} collapsed={collapsed} />

        <button className="ref-logout" onClick={onSignOut} title={collapsed ? "Cerrar sesión" : undefined}>
          <LogOut size={16} strokeWidth={1.9} className="ref-nav-icon" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}

function CampaignLimitInline({ usage: propUsage, collapsed }: { usage?: UsageData; collapsed: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [liveUsage, setLiveUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.usage) {
          setLiveUsage(data.usage);
        }
      })
      .catch(() => {});
  }, []);

  if (collapsed) return null;

  const usage = liveUsage ?? propUsage;
  const monthCount = usage?.monthCount ?? 0;
  const monthlyLimit = usage?.monthlyLimit && usage.monthlyLimit > 0 ? usage.monthlyLimit : 10000;
  const monthPercent = Math.min(100, Math.round((monthCount / monthlyLimit) * 100));
  const formattedMonthlyLimit = monthlyLimit.toLocaleString("es-PE");

  const todayCount = usage?.todayCount ?? 0;
  const dailyLimit = usage?.dailyLimit && usage.dailyLimit > 0 ? usage.dailyLimit : 500;
  const dailyPercent = Math.min(100, Math.round((todayCount / dailyLimit) * 100));
  const formattedDailyLimit = dailyLimit.toLocaleString("es-PE");

  const getProgressColor = (percent: number) =>
    percent >= 90
      ? "#ef4444"
      : percent >= 75
      ? "#f97316"
      : percent >= 35
      ? "#10b981"
      : "#94a3b8";

  const monthColor = getProgressColor(monthPercent);
  const dailyColor = getProgressColor(dailyPercent);

  return (
    <div className="ref-limit-inline" suppressHydrationWarning style={{ transition: "all 0.2s ease" }}>
      <div
        className="ref-limit-inline-header"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <strong>Límite de Envíos</strong>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--muted, #64748b)",
            cursor: "pointer",
            padding: "2px 4px",
            borderRadius: "4px",
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
            fontSize: "11px",
            fontWeight: 500,
          }}
          title={expanded ? "Ocultar límite diario" : "Ver límite diario"}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {expanded && (
        <div style={{ marginBottom: "8px", paddingTop: "4px", borderBottom: "1px dashed var(--am-border, #cbd5e1)", paddingBottom: "8px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 500 }}>Límite diario</p>
          <p style={{ margin: "0 0 4px", fontSize: "12px" }}>
            <b>{todayCount}/{formattedDailyLimit}</b> envíos hoy
          </p>
          <span className="ref-limit-bar">
            <i style={{ width: `${Math.max(4, dailyPercent)}%`, backgroundColor: dailyColor }} />
          </span>
        </div>
      )}

      <div>
        {expanded && <p style={{ margin: "0 0 2px", fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 500 }}>Límite mensual</p>}
        <p style={{ margin: "0 0 4px", fontSize: "12px" }}>
          <b>{monthCount}/{formattedMonthlyLimit}</b> envíos este mes
        </p>
        <span className="ref-limit-bar">
          <i style={{ width: `${Math.max(4, monthPercent)}%`, backgroundColor: monthColor }} />
        </span>
      </div>
    </div>
  );
}
