import { AlertCircle, Check, Clock3, Crown, Eye, FilePenLine, ShieldCheck, UserCog, UserPlus, UsersRound } from "lucide-react";
import type { Site, SiteInvitation, SiteMember, SiteRole } from "@/src/domain/types";

const roleInfo: Record<SiteRole, { label: string; short: string; detail: string; icon: typeof Crown }> = {
  site_admin: { label: "Administrador de marca", short: "Administra", detail: "Gestiona datos, equipo, campañas y aprobaciones.", icon: UserCog },
  editor: { label: "Editor", short: "Prepara", detail: "Prepara contenido y borradores, sin capacidad de envío.", icon: FilePenLine },
  approver: { label: "Aprobador", short: "Aprueba", detail: "Revisa, aprueba o rechaza campañas.", icon: ShieldCheck },
  viewer: { label: "Consulta", short: "Consulta", detail: "Acceso de lectura a actividad y resultados.", icon: Eye },
};

export function TeamAccessView({ ready, sites, members, invitations }: { ready: boolean; sites: Site[]; members: SiteMember[]; invitations: SiteInvitation[] }) {
  const pending = invitations.filter((item) => item.status === "pending");
  if (!ready) return <div className="team-layout refined">
    <section className="system-priority attention"><span><AlertCircle size={18}/></span><div><small>Preparación pendiente</small><strong>Activa el control de acceso por marca</strong><p>Las invitaciones permanecerán cerradas hasta completar la configuración de seguridad.</p></div></section>
    <RoleGuide/>
  </div>;

  return <div className="team-layout refined">
    <section className="team-overview" aria-label="Resumen del equipo">
      <article><span className="team-overview-icon positive"><UsersRound size={16}/></span><div><strong>{members.length}</strong><small>miembros activos</small></div></article>
      <article><span className={`team-overview-icon ${pending.length ? "attention" : ""}`}><Clock3 size={16}/></span><div><strong>{pending.length}</strong><small>invitaciones pendientes</small></div></article>
      <article><span className="team-overview-icon"><ShieldCheck size={16}/></span><div><strong>{sites.length}</strong><small>marcas protegidas</small></div></article>
    </section>

    {!members.length && !pending.length && <section className="team-empty-banner"><span><UserPlus size={18}/></span><div><strong>Acceso preparado, sin personas asignadas</strong><p>Los miembros aparecerán aquí cuando se incorporen mediante el acceso seguro de la plataforma.</p></div></section>}

    <section className="card team-access-panel">
      <header><div><h2>Acceso por marca</h2><p>Visualiza quién puede trabajar en cada operación y qué responsabilidad tiene.</p></div><span>{members.length + pending.length} accesos</span></header>
      <div className="team-brand-list">{sites.map((site) => {
        const siteMembers = members.filter((member) => member.siteId === site.id);
        const siteInvitations = pending.filter((invite) => invite.siteId === site.id);
        const initials = site.name.trim().split(/\s+/).slice(0,2).map((word) => word[0]).join("").toUpperCase();
        return <section className="team-brand" key={site.id}>
          <header><span style={{background:site.primaryColor || "#4f46e5"}}>{initials}</span><div><h3>{site.name}</h3><p>{site.domain}</p></div><strong>{siteMembers.length} {siteMembers.length === 1 ? "miembro" : "miembros"}</strong></header>
          <div className="team-member-list">{siteMembers.map((member) => { const role = roleInfo[member.role]; const Icon = role.icon; return <article key={member.id}><span className="member-avatar">{(member.fullName || member.email).slice(0,2).toUpperCase()}</span><div><strong>{member.fullName || member.email}</strong><small>{member.email}</small></div><span className="member-role refined"><Icon size={13}/><span>{role.label}</span></span></article>; })}
            {siteInvitations.map((invite) => <article className="pending" key={invite.id}><span className="member-avatar"><Clock3 size={14}/></span><div><strong>{invite.email}</strong><small>Esperando aceptación</small></div><span className="member-role refined"><Clock3 size={13}/><span>{roleInfo[invite.role].label}</span></span></article>)}
            {!siteMembers.length && !siteInvitations.length && <div className="team-brand-empty"><UsersRound size={18}/><span><strong>Sin personas asignadas</strong><small>Esta marca todavía no tiene miembros ni invitaciones pendientes.</small></span></div>}
          </div>
        </section>;
      })}</div>
    </section>
    <RoleGuide/>
  </div>;
}

function RoleGuide() { return <details className="role-guide refined"><summary><span><strong>Permisos y responsabilidades</strong><small>Consulta qué puede hacer cada perfil dentro de una marca.</small></span><Crown size={14}/></summary><div className="role-grid refined">{(Object.entries(roleInfo) as Array<[SiteRole,(typeof roleInfo)[SiteRole]]>).map(([id, role]) => { const Icon = role.icon; return <article key={id}><span><Icon size={16}/></span><div><small>{role.short}</small><strong>{role.label}</strong><p>{role.detail}</p></div><Check size={14}/></article>; })}</div></details>; }
