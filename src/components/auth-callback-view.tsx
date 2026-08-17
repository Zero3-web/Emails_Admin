"use client";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/src/database/supabase/browser";
import { safeRelativePath } from "@/src/security/redirect";

export function AuthCallbackView(){
  const router=useRouter(); const params=useSearchParams(); const [error,setError]=useState("");
  useEffect(()=>{const run=async()=>{const code=params.get("code");const next=safeRelativePath(params.get("next"),"/dashboard");const supabase=createSupabaseBrowser();if(!supabase){setError("La conexión de acceso no está configurada.");return}if(code){const {error:exchangeError}=await supabase.auth.exchangeCodeForSession(code);if(exchangeError){setError("El enlace no es válido o ya venció.");return}}const {data}=await supabase.auth.getSession();if(!data.session){setError("No pudimos confirmar tu sesión.");return}router.replace(next);router.refresh()};void run()},[params,router]);
  return <main className="auth-status"><span className="auth-mark">AM</span>{error?<><h1>No pudimos completar el acceso</h1><p>{error}</p><a className="btn primary" href="/login">Volver al acceso</a></>:<><Loader2 className="spin" size={22}/><h1>Validando acceso</h1><p>Esto tomará solo un momento.</p></>}</main>;
}
