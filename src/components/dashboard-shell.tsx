"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Site } from "@/src/domain/types";
import { createSupabaseBrowser } from "@/src/database/supabase/browser";
import { Sidebar } from "./shell/sidebar";
import { Topbar } from "./shell/topbar";

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
  const selectedSite = params?.get?.("site") ?? "all";
  const withSite = (href: string) => `${href}${selectedSite !== "all" ? `?site=${selectedSite}` : ""}`;

  const changeSite = (siteId: string) => {
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
      <Sidebar pathname={pathname} open={mobileOpen} withSite={withSite} onNavigate={() => setMobileOpen(false)} onSignOut={() => void signOut()} usage={usage} />
      {mobileOpen && <button className="ref-mobile-backdrop" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
      <main className="ref-main" suppressHydrationWarning>
        <Topbar sites={sites} selectedSite={selectedSite} userInitial={(user.name || user.email).slice(0, 1).toUpperCase()} onMenuOpen={() => setMobileOpen(true)} onSiteChange={changeSite} />
        <div className="ref-content"><div className="ref-page-transition" key={pathname}>{children}</div></div>
      </main>
    </div>
  );
}
