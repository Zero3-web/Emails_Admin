import { PageHeader } from "@/src/components/ui";
export default function Contacts() {
  return (
    <>
      <PageHeader
        eyebrow="Audiencia"
        title="Contactos"
        description="Gestión de contactos mediante Resend."
      />
      <div className="stats">
        <div className="card stat">
          <div className="stat-label">Total</div>
          <div className="stat-value">2.614</div>
          <div className="stat-foot">Datos simulados</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Activos</div>
          <div className="stat-value">2.487</div>
          <div className="stat-foot">95,1% del total</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Desuscritos</div>
          <div className="stat-value">127</div>
          <div className="stat-foot">4,9% del total</div>
        </div>
      </div>
      <div className="card empty">
        <strong>Los contactos se administran en Resend</strong>
        <p>
          Al conectar la integración podrás consultar segmentos, topics y estado
          de suscripción.
        </p>
        <button className="btn">Ir a integraciones</button>
      </div>
    </>
  );
}
