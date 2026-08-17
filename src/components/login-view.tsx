"use client";

import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createSupabaseBrowser } from "@/src/database/supabase/browser";

type Mode = "password" | "magic" | "recover";

export function LoginView() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setMessage({ kind: "error", text: "La conexión de acceso todavía no está configurada." });
      setLoading(false);
      return;
    }
    try {
      if (mode === "password") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace("/dashboard");
        router.refresh();
      } else if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`, shouldCreateUser: false },
        });
        if (error) throw error;
        setMessage({ kind: "success", text: "Te enviamos un enlace seguro. Revisa tu correo para continuar." });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) throw error;
        setMessage({ kind: "success", text: "Si la cuenta existe, recibirás instrucciones para recuperar el acceso." });
      }
    } catch (cause) {
      setMessage({ kind: "error", text: cause instanceof Error ? friendlyError(cause.message) : "No pudimos completar la solicitud." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page" suppressHydrationWarning>
      <section className="auth-story" aria-label="Area Mail" suppressHydrationWarning>
        <div className="auth-brand">
          <span className="auth-mark">AM</span>
          <strong>Area Mail</strong>
        </div>
        <div className="auth-story-copy">
          <span className="eyebrow">Panel privado</span>
          <h1>Información, campañas y decisiones en un mismo lugar.</h1>
          <p>Un espacio seguro para que cada marca gestione únicamente sus propiedades, contenido y audiencias.</p>
          <div className="auth-benefits">
            <span>
              <ShieldCheck size={16} />
              Acceso independiente por marca
            </span>
            <span>
              <LockKeyhole size={16} />
              Acciones protegidas por permisos
            </span>
            <span>
              <KeyRound size={16} />
              Aprobación antes de cada envío
            </span>
          </div>
        </div>
        <p className="auth-story-foot">Administración inmobiliaria · Lima, Perú</p>
      </section>
      <section className="auth-panel" suppressHydrationWarning>
        <div className="auth-card" suppressHydrationWarning>
          <div className="auth-mobile-brand">
            <span className="auth-mark">AM</span>
            <strong>Area Mail</strong>
          </div>
          <header>
            <span className="eyebrow">Acceso al panel</span>
            <h2>{mode === "recover" ? "Recupera tu acceso" : "Bienvenido"}</h2>
            <p>
              {mode === "magic"
                ? "Entra sin contraseña mediante un enlace seguro."
                : mode === "recover"
                ? "Te enviaremos instrucciones al correo asociado."
                : "Usa las credenciales asignadas a tu cuenta."}
            </p>
          </header>
          {mode !== "recover" && (
            <div className="auth-tabs" role="tablist" aria-label="Método de acceso">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "password"}
                onClick={() => {
                  setMode("password");
                  setMessage(null);
                }}
              >
                Contraseña
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "magic"}
                onClick={() => {
                  setMode("magic");
                  setMessage(null);
                }}
              >
                Enlace mágico
              </button>
            </div>
          )}
          <form onSubmit={submit} className="auth-form" suppressHydrationWarning>
            <div className="auth-field" suppressHydrationWarning>
              <label htmlFor="login-email">Correo electrónico</label>
              <div className="auth-input" suppressHydrationWarning>
                <Mail size={16} />
                <input
                  id="login-email"
                  autoComplete="email"
                  inputMode="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nombre@empresa.com"
                  suppressHydrationWarning
                />
              </div>
            </div>
            {mode === "password" && (
              <div className="auth-field" suppressHydrationWarning>
                <label htmlFor="login-password">Contraseña</label>
                <div className="auth-input" suppressHydrationWarning>
                  <LockKeyhole size={16} />
                  <input
                    id="login-password"
                    autoComplete="current-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Tu contraseña"
                    suppressHydrationWarning
                  />
                  <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}
            {message && <div className={`auth-feedback ${message.kind}`} role="status">{message.text}</div>}
            <button className="btn primary auth-submit" disabled={loading} aria-busy={loading}>
              {loading ? <Loader2 className="spin" size={16} /> : null}
              {mode === "password" ? "Ingresar" : mode === "magic" ? "Enviar enlace" : "Recuperar acceso"}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>
          <footer>
            {mode === "password" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("recover");
                  setMessage(null);
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            ) : mode === "recover" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  setMessage(null);
                }}
              >
                Volver al inicio de sesión
              </button>
            ) : (
              <span>El enlace vence por seguridad y solo puede utilizarse una vez.</span>
            )}
          </footer>
        </div>
        <p className="auth-help">El acceso es únicamente por invitación. Si necesitas una cuenta, contacta al administrador de tu marca.</p>
      </section>
    </main>
  );
}

function friendlyError(message: string) {
  if (message.toLowerCase().includes("invalid login")) return "El correo o la contraseña no son correctos.";
  if (message.toLowerCase().includes("email not confirmed")) return "Confirma tu correo antes de ingresar.";
  if (message.toLowerCase().includes("rate limit")) return "Realizaste demasiados intentos. Espera unos minutos.";
  return "No pudimos validar el acceso. Revisa tus datos o inténtalo nuevamente.";
}
