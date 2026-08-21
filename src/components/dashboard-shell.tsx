"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { Site } from "@/src/domain/types";
import { createSupabaseBrowser } from "@/src/database/supabase/browser";
import { Sidebar } from "./shell/sidebar";
import { Topbar } from "./shell/topbar";
import { MobileChrome } from "./mobile/mobile-chrome";

type DashboardShellProps = {
  children: React.ReactNode;
  sites: Site[];
  runtime: { environment: "development" | "production"; bulkSendingEnabled: boolean };
  user: { email: string; name: string; platformOwner: boolean };
  usage?: { todayCount: number; dailyLimit: number; monthCount: number; monthlyLimit: number };
};

export function DashboardShell({ children, sites, user, usage }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const selectedSite = params?.get?.("site") ?? "all";
  const withSite = (href: string) => `${href}${selectedSite !== "all" ? `?site=${selectedSite}` : ""}`;

  const [notification, setNotification] = useState<string | null>(null);
  const prevSiteRef = useRef<string | null>(selectedSite);

  // Restore saved brand if no ?site param in URL
  useEffect(() => {
    try {
      const currentParam = params?.get("site");
      const savedSite = localStorage.getItem("area-mail-selected-site");
      if (!currentParam && savedSite && savedSite !== "all" && sites.some((s) => s.id === savedSite)) {
        const next = new URLSearchParams(params?.toString() ?? "");
        next.set("site", savedSite);
        router.replace(`${pathname}?${next.toString()}`);
      } else if (currentParam) {
        localStorage.setItem("area-mail-selected-site", currentParam);
      }
    } catch {
      // Ignore storage errors
    }
  }, [params, pathname, router, sites]);

  useEffect(() => {
    if (prevSiteRef.current !== null && prevSiteRef.current !== selectedSite) {
      const site = sites.find((s) => s.id === selectedSite);
      const siteName = site ? site.name : "Todas las marcas";

      try {
        localStorage.setItem("area-mail-selected-site", selectedSite);
      } catch {
        // Ignore storage errors
      }

      const stateTimer = setTimeout(() => {
        setNotification(`Cambiado a ${siteName}`);
      }, 0);

      const hideTimer = setTimeout(() => {
        setNotification(null);
      }, 3000);

      prevSiteRef.current = selectedSite;

      return () => {
        clearTimeout(stateTimer);
        clearTimeout(hideTimer);
      };
    } else {
      prevSiteRef.current = selectedSite;
    }
  }, [selectedSite, sites]);

  const changeSite = (siteId: string) => {
    try {
      localStorage.setItem("area-mail-selected-site", siteId);
    } catch {
      // Ignore storage errors
    }
    const next = new URLSearchParams(params?.toString() ?? "");
    if (siteId === "all") next.delete("site");
    else next.set("site", siteId);
    router.push(`${pathname}${next.size ? `?${next}` : ""}`);
  };

  const signOut = async () => {
    await createSupabaseBrowser()?.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="ref-app">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <Sidebar pathname={pathname} open={mobileOpen} withSite={withSite} onNavigate={() => setMobileOpen(false)} onSignOut={() => void signOut()} usage={usage} platformOwner={user.platformOwner} />
      {mobileOpen && <button className="ref-mobile-backdrop" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
      <main className="ref-main" suppressHydrationWarning>
        <Topbar sites={sites} selectedSite={selectedSite} userInitial={(user.name || user.email).slice(0, 1).toUpperCase()} onMenuOpen={() => setMobileOpen(true)} onSiteChange={changeSite} />
        <MobileChrome
          pathname={pathname}
          sites={sites}
          selectedSite={selectedSite}
          userInitial={(user.name || user.email).slice(0, 1).toUpperCase()}
          moreOpen={mobileMoreOpen}
          withSite={withSite}
          onMoreChange={setMobileMoreOpen}
          onSiteChange={changeSite}
          onSignOut={() => void signOut()}
          platformOwner={user.platformOwner}
        />
        <div className="ref-content" id="main-content" tabIndex={-1}><div className="ref-page-transition" key={pathname}>{children}</div></div>
      </main>

      {notification && (
        <div style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 9999,
          background: "var(--am-surface, #ffffff)",
          color: "var(--am-ink, #1e222a)",
          padding: "10px 16px",
          borderRadius: "8px",
          fontSize: "12px",
          fontWeight: 500,
          boxShadow: "var(--am-shadow-popover, 0 10px 28px rgba(0, 0, 0, 0.08))",
          display: "flex",
          alignItems: "center",
          border: "1px solid var(--am-border, #edf0f2)",
          pointerEvents: "none",
          animation: "slideInNotification 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
        }}>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes slideInNotification {
              from { opacity: 0; transform: translateY(20px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}} />
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
}
