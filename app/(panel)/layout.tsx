import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { DashboardShell } from "@/src/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("area_access_token")?.value;
  const mockSession = cookieStore.get("area_mock_session")?.value;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    if (!accessToken) redirect("/login");
    const client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    );
    const { data } = await client.auth.getUser(accessToken);
    if (!data.user) redirect("/login");
  } else if (!mockSession) {
    redirect("/login");
  }
  return <DashboardShell>{children}</DashboardShell>;
}
