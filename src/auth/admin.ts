import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
export async function isAdminSession() {
  const store = await cookies();
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    const token = store.get("area_access_token")?.value;
    if (!token) return false;
    const client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    );
    const { data } = await client.auth.getUser(token);
    return Boolean(data.user);
  }
  return store.get("area_mock_session")?.value === "active";
}
