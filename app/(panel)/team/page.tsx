import { PageHeader } from "@/src/components/ui";
import { TeamAccessView } from "@/src/components/team-access-view";
import { getAccessOverview, getSites } from "@/src/database/repositories";
import { requirePanelAccess } from "@/src/auth/server";
import { redirect } from "next/navigation";

export default async function TeamPage(){
  const access = await requirePanelAccess();
  if (!access.platformOwner && !access.memberships.some((item) => item.role === "site_admin")) redirect("/no-access");
  const [overview,sites]=await Promise.all([getAccessOverview(),getSites()]);
  return <><PageHeader eyebrow="Configuración" title="Equipo y accesos" description="Consulta las personas, responsabilidades y permisos de cada marca."/><TeamAccessView ready={overview.ready} sites={sites} members={overview.members} invitations={overview.invitations}/></>;
}
