import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };
  if (!email || !password)
    return NextResponse.json(
      { error: "Completa email y contraseña." },
      { status: 400 },
    );
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    const response = NextResponse.json({ ok: true, mode: "mock" });
    response.cookies.set("area_mock_session", "active", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
      path: "/",
    });
    return response;
  }
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session)
    return NextResponse.json(
      { error: "Credenciales inválidas." },
      { status: 401 },
    );
  const response = NextResponse.json({ ok: true, mode: "supabase" });
  response.cookies.set("area_access_token", data.session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: data.session.expires_in,
    path: "/",
  });
  return response;
}
