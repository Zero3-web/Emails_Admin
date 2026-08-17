import type { BlogPost, Property, Site } from "@/src/domain/types";
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
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
          backgroundColor: "#f4f5f7",
          fontFamily: "Arial,Helvetica,sans-serif",
          color: "#18212f",
        }}
      >
        <Container
          style={{
            maxWidth: 620,
            margin: "0 auto",
            backgroundColor: "#ffffff",
          }}
        >
          <Section
            style={{ padding: "22px 28px", borderBottom: "1px solid #e7e9ed" }}
          >
            <Text
              style={{
                margin: 0,
                color: "#18212f",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {site.name}
            </Text>
          </Section>
          <Section
            style={{
              padding: "34px 28px 26px",
              backgroundColor: site.primaryColor,
              color: "#ffffff",
            }}
          >
            <Text
              style={{
                margin: "0 0 8px",
                opacity: 0.75,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "1.3px",
                textTransform: "uppercase",
              }}
            >
              Selección inmobiliaria
            </Text>
            <Text
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 700,
                lineHeight: "35px",
              }}
            >
              {title}
            </Text>
          </Section>
          <Section style={{ padding: "26px 28px 10px" }}>{children}</Section>
          <Section
            style={{
              padding: "22px 28px 28px",
              textAlign: "center",
              fontSize: 12,
              color: "#737b84",
              borderTop: "1px solid #eceeef",
            }}
          >
            <Text style={{ margin: "0 0 8px" }}>
              {site.name} · {site.domain}
            </Text>
            <Link
              style={{ color: "#737b84", textDecoration: "underline" }}
              href={unsubscribeUrl}
            >
              Cancelar suscripción
            </Link>
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
      {properties.map((property) => (
        <Section
          key={property.id}
          style={{
            overflow: "hidden",
            marginBottom: 18,
            border: "1px solid #e5e7eb",
            borderRadius: 10,
          }}
        >
          {property.imageUrl && (
            <Img
              src={property.imageUrl}
              alt=""
              width="562"
              style={{
                display: "block",
                width: "100%",
                height: 240,
                objectFit: "cover",
              }}
            />
          )}
          <Section style={{ padding: "18px 18px 20px" }}>
            <Text
              style={{
                margin: "0 0 7px",
                color: "#18212f",
                fontSize: 18,
                fontWeight: 700,
                lineHeight: "24px",
              }}
            >
              {property.title}
            </Text>
            <Text
              style={{
                margin: "0 0 10px",
                color: "#69717a",
                fontSize: 13,
                lineHeight: "19px",
              }}
            >
              {property.location}
              {property.area > 0
                ? ` · ${property.area.toLocaleString("es-PE")} m²`
                : ""}
            </Text>
            <Text
              style={{
                margin: "0 0 16px",
                color: "#18212f",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {property.price > 0
                ? `${property.currency} ${property.price.toLocaleString("es-PE")}`
                : "Precio a consultar"}
            </Text>
            <Button
              href={property.publicUrl}
              style={{
                display: "inline-block",
                padding: "11px 16px",
                borderRadius: 7,
                backgroundColor: site.primaryColor,
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Ver ficha de la oficina
            </Button>
          </Section>
        </Section>
      ))}
    </>
  );
}
