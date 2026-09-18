"use client";

import { useState, useEffect, useRef, startTransition } from "react";
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
  usage?: {
    todayCount: number;
    dailyLimit: number;
    monthCount: number;
    monthlyLimit: number;
    bySite?: Record<string, { todayCount: number; dailyLimit: number; monthCount: number; monthlyLimit: number }>;
  };
};

export function DashboardShell({ children, sites, user, usage }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const selectedSite = params?.get?.("site") ?? "all";

  // Optimistic site state so UI updates in 0ms without waiting for RSC roundtrip
  const [activeSite, setActiveSite] = useState<string>(selectedSite);

  useEffect(() => {
    setActiveSite(selectedSite);
  }, [selectedSite]);

  const withSite = (href: string) => `${href}${activeSite !== "all" ? `?site=${activeSite}` : ""}`;

  const [notification, setNotification] = useState<string | null>(null);
  const prevSiteRef = useRef<string | null>(activeSite);

  // Restore saved brand if no ?site param in URL
  useEffect(() => {
    try {
      const currentParam = params?.get("site");
      const savedSite = localStorage.getItem("area-mail-selected-site");
      if (!currentParam && savedSite && savedSite !== "all" && sites.some((s) => s.id === savedSite)) {
        setActiveSite(savedSite);
        document.cookie = `area_mail_site=${encodeURIComponent(savedSite)}; path=/; max-age=31536000; SameSite=Lax`;
        window.dispatchEvent(new CustomEvent("area-mail-site-change", { detail: savedSite }));
        const next = new URLSearchParams(params?.toString() ?? "");
        next.set("site", savedSite);
        const targetUrl = `${pathname}?${next.toString()}`;
        window.history.replaceState(null, "", targetUrl);
        router.replace(targetUrl, { scroll: false });
      } else if (currentParam) {
        localStorage.setItem("area-mail-selected-site", currentParam);
        document.cookie = `area_mail_site=${encodeURIComponent(currentParam)}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {
      // Ignore storage errors
    }
  }, [params, pathname, router, sites]);

  useEffect(() => {
    if (prevSiteRef.current !== null && prevSiteRef.current !== activeSite) {
      const site = sites.find((s) => s.id === activeSite);
      const siteName = site ? site.name : "Todas las marcas";

      try {
        localStorage.setItem("area-mail-selected-site", activeSite);
        document.cookie = `area_mail_site=${encodeURIComponent(activeSite)}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {
        // Ignore storage errors
      }

      setNotification(`Cambiado a ${siteName}`);
      const hideTimer = setTimeout(() => {
        setNotification(null);
      }, 3000);

      prevSiteRef.current = activeSite;

      return () => {
        clearTimeout(hideTimer);
      };
    } else {
      prevSiteRef.current = activeSite;
    }
  }, [activeSite, sites]);

  const changeSite = (siteId: string) => {
    // 1. Instant optimistic state update in 0ms
    setActiveSite(siteId);

    // 2. Persist in localStorage & cookie
    try {
      localStorage.setItem("area-mail-selected-site", siteId);
      document.cookie = `area_mail_site=${encodeURIComponent(siteId)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore storage errors
    }

    const site = sites.find((s) => s.id === siteId);
    const siteName = site ? site.name : "Todas las marcas";
    setNotification(`Cambiado a ${siteName}`);
    setTimeout(() => setNotification(null), 3000);

    // 3. Dispatch immediate event for active views to update instantly
    window.dispatchEvent(new CustomEvent("area-mail-site-change", { detail: siteId }));

    // 4. Update browser URL immediately without page reload
    const next = new URLSearchParams(params?.toString() ?? "");
    if (siteId === "all") next.delete("site");
    else next.set("site", siteId);
    const targetUrl = `${pathname}${next.size ? `?${next}` : ""}`;
    window.history.replaceState(null, "", targetUrl);

    // 5. Synchronize Next.js Server Components in background without blocking UI
    startTransition(() => {
      router.replace(targetUrl, { scroll: false });
    });
  };

  const signOut = async () => {
    await createSupabaseBrowser()?.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="ref-app">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <Sidebar
        pathname={pathname}
        open={mobileOpen}
        withSite={withSite}
        onNavigate={() => setMobileOpen(false)}
        onSignOut={() => void signOut()}
        usage={usage}
        selectedSite={activeSite}
        platformOwner={user.platformOwner}
      />
      {mobileOpen && <button className="ref-mobile-backdrop" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
      <main className="ref-main" suppressHydrationWarning>
        <Topbar
          sites={sites}
          selectedSite={activeSite}
          userInitial={(user.name || user.email).slice(0, 1).toUpperCase()}
          onMenuOpen={() => setMobileOpen(true)}
          onSiteChange={changeSite}
        />
        <MobileChrome
          pathname={pathname}
          sites={sites}
          selectedSite={activeSite}
          userInitial={(user.name || user.email).slice(0, 1).toUpperCase()}
          moreOpen={mobileMoreOpen}
          withSite={withSite}
          onMoreChange={setMobileMoreOpen}
          onSiteChange={changeSite}
          onSignOut={() => void signOut()}
          platformOwner={user.platformOwner}
        />
        <div className="ref-content" id="main-content" tabIndex={-1}>
          <div className="ref-page-transition" key={pathname}>
            {children}
          </div>
        </div>
      </main>

      {notification && (
        <div
          style={{
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
            animation: "slideInNotification 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          }}
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
            @keyframes slideInNotification {
              from { opacity: 0; transform: translateY(20px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `,
            }}
          />
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
}
