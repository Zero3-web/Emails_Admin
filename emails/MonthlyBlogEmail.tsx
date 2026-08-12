import { EmailFrame, type BlogEmailProps } from "./email-shared";
export function MonthlyBlogEmail({
  site,
  posts,
  unsubscribeUrl,
}: BlogEmailProps) {
  return (
    <EmailFrame
      site={site}
      title="Novedades del mes"
      unsubscribeUrl={unsubscribeUrl}
    >
      {posts.map((p) => (
        <article
          key={p.id}
          style={{
            borderBottom: "1px solid #e9ebed",
            padding: "0 0 18px",
            marginBottom: 18,
          }}
        >
          <h2 style={{ fontSize: 19 }}>{p.title}</h2>
          <p style={{ color: "#69717a", lineHeight: 1.5 }}>{p.excerpt}</p>
          <small>{new Date(p.publishedAt).toLocaleDateString("es-PE")}</small>
          <p>
            <a
              style={{ color: site.primaryColor, fontWeight: 700 }}
              href={p.publicUrl}
            >
              Leer artículo →
            </a>
          </p>
        </article>
      ))}
    </EmailFrame>
  );
}
