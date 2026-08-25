import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/src/database/supabase/server";
import type { SiteRole } from "@/src/domain/types";
import { cache } from "react";

export type AccessContext = {
  user: { id: string; email: string };
  fullName: string;
  platformOwner: boolean;
  memberships: Array<{ siteUuid: string; siteId: string; role: SiteRole }>;
};

const currentUser = cache(async () => {
  try {
    const store = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    const client = createServerClient(url, key, {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (items) => {
          try { items.forEach(({ name, value, options }) => store.set(name, value, options)); }
          catch { /* Server Components cannot always refresh cookies; the callback can. */ }
        },
      },
    });
    const { data, error } = await client.auth.getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
});

export const getAccessContext = cache(async (): Promise<AccessContext | null> => {
  const user = await currentUser();
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminUrl = process.env.SUPABASE_URL;
  if (publicUrl && adminUrl && new URL(publicUrl).origin !== new URL(adminUrl).origin) {
    throw new Error("La configuración de Supabase apunta a proyectos diferentes.");
  }
  const db = createSupabaseAdmin();
  if (!user || !db) return null;
  const [profileResult, membershipResult] = await Promise.all([
    db.from("profiles").select("full_name,platform_role").eq("id", user.id).maybeSingle(),
    db.from("site_members").select("site_id,role,sites!inner(slug)").eq("user_id", user.id),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (membershipResult.error) throw membershipResult.error;
  return {
    user: { id: user.id, email: user.email ?? "" },
    fullName: profileResult.data?.full_name ?? user.user_metadata?.full_name ?? "",
    platformOwner: profileResult.data?.platform_role === "platform_owner",
    memberships: (membershipResult.data ?? []).map((row) => ({
      siteUuid: row.site_id,
      siteId: String((row.sites as unknown as { slug?: string })?.slug ?? "").replace(/^area-/, ""),
      role: row.role as SiteRole,
    })),
  };
});

export async function requirePanelAccess() {
  const access = await getAccessContext();
  if (!access) redirect("/login");
  if (!access.platformOwner && !access.memberships.length) redirect("/no-access");
  return access;
}

export async function requireApiAccess() {
  const access = await getAccessContext();
  if (!access) throw new AuthError("Debes iniciar sesión.", 401);
  if (!access.platformOwner && !access.memberships.length) throw new AuthError("Tu cuenta no tiene acceso a ninguna marca.", 403);
  return access;
}

export function assertPlatformOwner(access: AccessContext) {
  if (!access.platformOwner) throw new AuthError("Esta acción requiere acceso de propietario.", 403);
}

export function assertSiteRole(access: AccessContext, siteId: string, roles: SiteRole[]) {
  if (access.platformOwner) return;
  const membership = access.memberships.find((item) => item.siteId === siteId);
  if (!membership || !roles.includes(membership.role)) throw new AuthError("No tienes permiso para realizar esta acción en esta marca.", 403);
}

export class AuthError extends Error {
  constructor(message: string, public status: 401 | 403) { super(message); }
}
