import {
  EmailFrame,
  PropertyRows,
  type PropertyEmailProps,
} from "./email-shared";
export function WeeklyPropertiesEmail({
  site,
  properties,
  unsubscribeUrl,
}: PropertyEmailProps) {
  return (
    <EmailFrame
      site={site}
      title="Nuevas propiedades de esta semana"
      unsubscribeUrl={unsubscribeUrl}
    >
      <p>Descubre las oportunidades incorporadas recientemente.</p>
      <PropertyRows site={site} properties={properties} />
    </EmailFrame>
  );
}
