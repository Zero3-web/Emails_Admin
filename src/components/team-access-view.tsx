import { Check, Clock3, Crown, Eye, FilePenLine, ShieldCheck, UserCog, UsersRound } from "lucide-react";
import type { Site, SiteInvitation, SiteMember, SiteRole } from "@/src/domain/types";

const roleInfo: Record<SiteRole, { label: string; detail: string; icon: typeof Crown }> = {
  site_admin: { label: "Administrador del sitio", detail: "Gestiona datos, equipo, campañas y aprobaciones.", icon: UserCog },
  editor: { label: "Editor", detail: "Prepara contenido y borradores, sin capacidad de envío.", icon: FilePenLine },
  approver: { label: "Aprobador", detail: "Revisa, aprueba o rechaza campañas.", icon: ShieldCheck },
  viewer: { label: "Consulta", detail: "Acceso de lectura a actividad y resultados.", icon: Eye },
};

export function TeamAccessView({ ready, sites, members, invitations }: { ready: boolean; sites: Site[]; members: SiteMember[]; invitations: SiteInvitation[] }) {
  if (!ready) return <div className="team-layout">
    <section className="card access-setup"><span className="access-setup-icon"><UsersRound size={20}/></span><div><span className="eyebrow">Preparación requerida</span><h2>Activa el control de acceso por sitio</h2><p>La interfaz está preparada, pero las invitaciones permanecerán cerradas hasta aplicar la migración de seguridad. Así evitamos crear accesos que todavía no estarían protegidos.</p><code>202608130002_tenancy_and_roles.sql</code></div></section>
    <RoleGuide/>
  </div>;
  return <div className="team-layout">
    <section className="team-toolbar"><div><strong>{members.length} miembros activos</strong><span>{invitations.filter((item)=>item.status === "pending").length} invitaciones pendientes</span></div><button className="btn primary" disabled title="Se habilitará junto con Supabase Auth">Invitar persona</button></section>
    <div className="team-site-list">{sites.map((site) => { const siteMembers = members.filter((member)=>member.siteId===site.id); const siteInvitations=invitations.filter((invite)=>invite.siteId===site.id&&invite.status==="pending"); return <section className="card team-site" key={site.id}><header><div className="team-site-mark" style={{background:site.primaryColor}}>{site.name.slice(0,2).toUpperCase()}</div><div><h2>{site.name}</h2><p>{site.domain}</p></div><span>{siteMembers.length} miembros</span></header><div className="team-rows">{siteMembers.map((member)=>{const role=roleInfo[member.role];const Icon=role.icon;return <article key={member.id}><span className="member-avatar">{(member.fullName||member.email).slice(0,2).toUpperCase()}</span><div><strong>{member.fullName||member.email}</strong><small>{member.email}</small></div><span className="member-role"><Icon size={14}/>{role.label}</span></article>})}{siteInvitations.map((invite)=><article className="pending" key={invite.id}><span className="member-avatar"><Clock3 size={15}/></span><div><strong>{invite.email}</strong><small>Invitación pendiente</small></div><span className="member-role">{roleInfo[invite.role].label}</span></article>)}{!siteMembers.length&&!siteInvitations.length&&<div className="team-empty">Todavía no hay clientes asignados a este sitio.</div>}</div></section>})}</div>
    <RoleGuide/>
  </div>;
}

function RoleGuide(){return <details className="role-guide"><summary>Ver permisos disponibles</summary><div className="role-grid">{(Object.entries(roleInfo) as Array<[SiteRole,(typeof roleInfo)[SiteRole]]>).map(([id,role])=>{const Icon=role.icon;return <article className="card" key={id}><span><Icon size={17}/></span><div><strong>{role.label}</strong><p>{role.detail}</p></div><Check size={15}/></article>})}</div></details>}
