import { PageHeader, SiteMark, StatusBadge } from "@/src/components/ui";
import { TaskButton } from "@/src/components/task-button";
import { integrations, sites } from "@/src/data/mock";
export default function Integrations() {
  return (
    <>
      <PageHeader
        eyebrow="Conexiones"
        title="Integraciones"
        description="Gestiona los servicios que alimentan y distribuyen tus campañas."
        action={<span className="badge pending">Modo mock activo</span>}
      />
      <div className="automation-groups">
        {sites.map((s) => (
          <section key={s.id}>
            <div className="group-head">
              <SiteMark site={s} small />
              {s.name.toUpperCase()}
            </div>
            <div className="sites-grid">
              {integrations
                .filter((x) => x.siteId === s.id)
                .map((x) => (
                  <article className="card form-card" key={x.id}>
                    <div className="section-head">
                      <div>
                        <strong style={{ textTransform: "capitalize" }}>
                          {x.provider}
                        </strong>
                        <p className="subtitle" style={{ marginTop: 4 }}>
                          {x.status === "connected"
                            ? "Última sincronización hace 2 horas"
                            : "Pendiente de configuración"}
                        </p>
                      </div>
                      <StatusBadge status={x.status} />
                    </div>
                    {x.provider === "resend" && (
                      <>
                        <div className="field">
                          <label htmlFor={`${x.id}-domain`}>
                            Dominio de envío
                          </label>
                          <input
                            id={`${x.id}-domain`}
                            defaultValue={s.domain}
                          />
                        </div>
                        <div className="status-line">
                          <span>Estado del dominio</span>
                          <span className="badge pending">No configurado</span>
                        </div>
                      </>
                    )}
                    <div style={{ marginTop: 12 }}>
                      {x.provider === "tokko" ? (
                        <TaskButton
                          name="sync-properties"
                          label="Probar sincronización"
                        />
                      ) : x.provider === "wordpress" ? (
                        <TaskButton
                          name="sync-blog-posts"
                          label="Probar sincronización"
                        />
                      ) : (
                        <TaskButton
                          name="generate-weekly-properties"
                          label="Probar broadcast mock"
                        />
                      )}
                    </div>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
