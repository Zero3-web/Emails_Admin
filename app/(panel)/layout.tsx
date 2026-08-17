import { DashboardShell } from "@/src/components/dashboard-shell";
import { getResendUsage, getSites } from "@/src/database/repositories";
import { getRuntimeSafety } from "@/src/config/runtime";
import { requirePanelAccess } from "@/src/auth/server";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const access = await requirePanelAccess();
  const [sites, usage] = await Promise.all([
    getSites().then((items) => items.filter((site) => access.platformOwner || access.memberships.some((member) => member.siteId === site.id))),
    getResendUsage(),
  ]);
  return <DashboardShell sites={sites} runtime={getRuntimeSafety()} user={{ email: access.user.email, name: access.fullName, platformOwner: access.platformOwner }} usage={usage}>{children}</DashboardShell>;
}
