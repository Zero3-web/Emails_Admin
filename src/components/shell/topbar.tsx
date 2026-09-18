"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, Moon, Sun } from "lucide-react";
import type { Site } from "@/src/domain/types";
import { getSiteInitials } from "@/src/components/ui";

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

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (brandMenuRef.current && !brandMenuRef.current.contains(event.target as Node)) {
        brandMenuRef.current.removeAttribute("open");
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") brandMenuRef.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    const applyTheme = () => {
      document.documentElement.dataset.theme = nextTheme;
      try {
        localStorage.setItem("area-mail-theme", nextTheme);
      } catch {
        // Ignore storage errors
      }
    };
    const root = document as Document & { startViewTransition?: (callback: () => void) => void };
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && root.startViewTransition) {
      root.startViewTransition(applyTheme);
    } else {
      applyTheme();
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
          aria-label="Alternar tema claro u oscuro"
          title="Cambiar tema"
        >
          <Moon size={16} className="theme-icon-light" />
          <Sun size={16} className="theme-icon-dark" />
        </button>
        <details className="ref-brand-menu" ref={brandMenuRef}>
          <summary aria-label="Cambiar marca" aria-haspopup="listbox">
            {currentSite ? (
              currentSite.logoUrl ? (
                <img
                  key={selectedSite}
                  src={currentSite.logoUrl}
                  alt={currentSite.name}
                  className="ref-brand-avatar"
                  style={{
                    objectFit: "contain",
                    padding: "2px",
                    background: "#ffffff",
                    animation: "ref-avatar-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                  }}
                />
              ) : (
                <span
                  key={selectedSite}
                  className="ref-brand-avatar"
                  aria-hidden="true"
                  style={{
                    backgroundColor: currentSite.primaryColor,
                    animation: "ref-avatar-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                  }}
                >
                  {getSiteInitials(currentSite.name)}
                </span>
              )
            ) : null}
            <span className="ref-brand-current">{currentSite?.name ?? "Todas las marcas"}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          <div className="ref-brand-popover" role="listbox" aria-label="Marcas disponibles">
            <p>Marca activa</p>
            <button
              type="button"
              role="option"
              className="ref-brand-all-option"
              aria-selected={selectedSite === "all"}
              onClick={() => selectSite("all")}
            >
              <span><strong>Todas las marcas</strong><small>Vista consolidada</small></span>
              {selectedSite === "all" && <i aria-hidden="true" />}
            </button>
            {sites.map((site) => (
              <button
                key={site.id}
                type="button"
                role="option"
                aria-selected={selectedSite === site.id}
                onClick={() => selectSite(site.id)}
              >
                {site.logoUrl ? (
                  <img
                    src={site.logoUrl}
                    alt={site.name}
                    className="ref-brand-option-mark"
                    style={{
                      objectFit: "contain",
                      padding: "2px",
                      background: "#ffffff",
                    }}
                  />
                ) : (
                  <span className="ref-brand-option-mark" style={{ backgroundColor: site.primaryColor }}>
                    {getSiteInitials(site.name)}
                  </span>
                )}
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
