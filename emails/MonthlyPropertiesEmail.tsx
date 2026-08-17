import {
  EmailFrame,
  PropertyRows,
  type PropertyEmailProps,
} from "./email-shared";

export function MonthlyPropertiesEmail({
  site,
  properties,
  unsubscribeUrl,
}: PropertyEmailProps) {
  return (
    <EmailFrame
      site={site}
      title="Oficinas disponibles"
      unsubscribeUrl={unsubscribeUrl}
    >
      <p>Una selección mensual de oficinas para hacer crecer tu negocio.</p>
      <PropertyRows site={site} properties={properties} />
    </EmailFrame>
  );
}
