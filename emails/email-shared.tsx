import type { BlogPost, Property, Site } from "@/src/domain/types";
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Link,
  Section,
  Text,
} from "react-email";
export type PropertyEmailProps = {
  site: Site;
  properties: Property[];
  unsubscribeUrl?: string;
};
export type BlogEmailProps = {
  site: Site;
  posts: BlogPost[];
  unsubscribeUrl?: string;
};
export function EmailFrame({
  site,
  title,
  children,
  unsubscribeUrl = "#",
}: {
  site: Site;
  title: string;
  children: React.ReactNode;
  unsubscribeUrl?: string;
}) {
  return (
    <Html lang="es">
      <Head />
      <Body
        style={{
          margin: 0,
          backgroundColor: "#f2f4f5",
          fontFamily: "Arial,sans-serif",
          color: "#17202a",
        }}
      >
        <Container
          style={{ maxWidth: 620, margin: "0 auto", backgroundColor: "white" }}
        >
          <Section
            style={{
              backgroundColor: site.primaryColor,
              color: "white",
              padding: "32px 28px",
            }}
          >
            <Text style={{ fontWeight: 700 }}>{site.name}</Text>
            <Text style={{ fontSize: 27, fontWeight: 700, margin: "28px 0 0" }}>
              {title}
            </Text>
          </Section>
          <Section style={{ padding: 28 }}>{children}</Section>
          <Section
            style={{
              padding: 24,
              textAlign: "center",
              fontSize: 12,
              color: "#737b84",
              borderTop: "1px solid #eceeef",
            }}
          >
            <Text>
              {site.name} · {site.domain}
            </Text>
            <Link href={unsubscribeUrl}>Desuscribirme</Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
export function PropertyRows({
  site,
  properties,
}: {
  site: Site;
  properties: Property[];
}) {
  return (
    <>
      {properties.map((p) => (
        <Section
          key={p.id}
          style={{
            border: "1px solid #e9ebed",
            borderRadius: 8,
            padding: 16,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
            {p.title}
          </Text>
          <Text style={{ color: "#69717a" }}>
            {p.location} · {p.area} m²
          </Text>
          <Text style={{ fontWeight: 700 }}>
            {p.currency} {p.price.toLocaleString()}
          </Text>
          <Button
            href={p.publicUrl}
            style={{
              backgroundColor: site.primaryColor,
              color: "white",
              padding: "10px 14px",
              borderRadius: 6,
            }}
          >
            Ver propiedad
          </Button>
        </Section>
      ))}
    </>
  );
}
