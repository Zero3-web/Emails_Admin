"use client";

import { useRef } from "react";
import { ChevronDown, Moon, Sun } from "lucide-react";
import type { Site } from "@/src/domain/types";

type TopbarProps = {
  sites: Site[];
  selectedSite: string;
  userInitial: string;
  onMenuOpen: () => void;
  onSiteChange: (siteId: string) => void;
};

export function Topbar({
  sites,
  selectedSite,
  userInitial,
  onMenuOpen,
  onSiteChange,
}: TopbarProps) {
  const brandMenuRef = useRef<HTMLDetailsElement>(null);
  const toggleTheme = () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    try {
      localStorage.setItem("area-mail-theme", nextTheme);
    } catch {
      // Ignore storage errors
    }
  };

  const currentSite = sites.find((site) => site.id === selectedSite);
  const selectSite = (siteId: string) => {
    onSiteChange(siteId);
    brandMenuRef.current?.removeAttribute("open");
  };

  return (
    <header className="ref-topbar">
      <button className="ref-mobile-menu" onClick={onMenuOpen} aria-label="Abrir menú">
        AM
      </button>
      <div className="ref-top-right">
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label="Cambiar tema de color"
          title="Cambiar tema"
        >
          <Moon size={16} className="theme-icon-light" />
          <Sun size={16} className="theme-icon-dark" />
        </button>
        <details className="ref-brand-menu" ref={brandMenuRef}>
          <summary aria-label="Cambiar marca">
            <span className="ref-brand-avatar" aria-hidden="true">{userInitial}</span>
            <span className="ref-brand-current">{currentSite?.name ?? "Todas las marcas"}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          <div className="ref-brand-popover" role="listbox" aria-label="Marcas disponibles">
            <p>Marca activa</p>
            <button type="button" role="option" aria-selected={selectedSite === "all"} onClick={() => selectSite("all")}>
              <span className="ref-brand-option-mark">AM</span>
              <span><strong>Todas las marcas</strong><small>Vista consolidada</small></span>
              {selectedSite === "all" && <i aria-hidden="true" />}
            </button>
            {sites.map((site) => (
              <button key={site.id} type="button" role="option" aria-selected={selectedSite === site.id} onClick={() => selectSite(site.id)}>
                <span className="ref-brand-option-mark" style={{ backgroundColor: site.primaryColor }}>{site.name.slice(0, 2).toUpperCase()}</span>
                <span><strong>{site.name}</strong><small>{site.domain || "Marca configurada"}</small></span>
                {selectedSite === site.id && <i aria-hidden="true" />}
              </button>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}
