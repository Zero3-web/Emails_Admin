import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/src/auth/server";

export default async function NoAccessPage() {
  const access = await getAccessContext();
  if (!access) redirect("/login");
  if (access.platformOwner || access.memberships.length) redirect("/dashboard");
  return <main className="auth-status"><span className="auth-mark">AM</span><ShieldAlert size={24}/><h1>Tu cuenta aún no tiene acceso</h1><p>Solicita al administrador que te asigne una marca y un rol.</p><a className="btn" href="/login">Volver al acceso</a></main>;
}
