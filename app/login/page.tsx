import { LoginForm } from "@/src/components/login-form";
export default function Login() {
  return (
    <main className="login-page">
      <section className="login-art">
        <div className="brand">
          <span className="brand-mark login-mark">AM</span>
          <span>Area Mail</span>
        </div>
        <div>
          <div className="eyebrow login-eyebrow">Operaciones inmobiliarias</div>
          <h1>Un solo lugar para cada marca, campaña y automatización.</h1>
          <p className="login-copy">
            Administra la comunicación de Area Prime, Area Retail y Area Hub con
            control y consistencia.
          </p>
        </div>
        <small className="login-foot">
          Acceso exclusivo para administradores
        </small>
      </section>
      <section className="login-panel">
        <LoginForm />
      </section>
    </main>
  );
}
