import { PageHeader } from "@/src/components/ui";
import { TemplatesView } from "@/src/components/templates-view";
import { sites } from "@/src/data/mock";
export default function Templates() {
  return (
    <>
      <PageHeader
        eyebrow="Contenido"
        title="Plantillas de email"
        description="Previsualiza cada formato con la identidad de las tres marcas."
      />
      <TemplatesView sites={sites} />
    </>
  );
}
