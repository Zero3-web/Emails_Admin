import { notFound } from "next/navigation";
import { PageHeader, StatusBadge } from "@/src/components/ui";
import { SiteForm } from "@/src/components/site-form";
import { siteById } from "@/src/data/mock";
export default async function SiteDetail({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const site = siteById(siteId);
  if (!site) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Configuración del sitio"
        title={site.name}
        description={site.description}
      />
      <div className="settings-grid">
        <SiteForm site={site} />
        <aside>
          <div className="card form-card">
            <h2 className="section-title">Integraciones</h2>
            {["Tokko", "WordPress", "Resend"].map((p) => (
              <div className="status-line" key={p}>
                <span>{p}</span>
                <StatusBadge
                  status={
                    p === "WordPress" && site.id === "prime"
                      ? "connected"
                      : "pending"
                  }
                />
              </div>
            ))}
            <a
              className="btn"
              href="/integrations"
              style={{ width: "100%", marginTop: 12 }}
            >
              Configurar integraciones
            </a>
          </div>
          <div className="card form-card" style={{ marginTop: 16 }}>
            <h2 className="section-title">Clasificación Tokko</h2>
            <p
              className="subtitle"
              style={{ lineHeight: 1.5, margin: "10px 0 14px" }}
            >
              Las reglas se configurarán cuando esté disponible la estructura
              real de Tokko.
            </p>
            <pre
              style={{
                background: "#f6f7f8",
                padding: 12,
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              {JSON.stringify(site.tokkoFilter, null, 2)}
            </pre>
          </div>
        </aside>
      </div>
    </>
  );
}
