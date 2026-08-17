import { ContactsView } from "@/src/components/contacts-view";
import { PageHeader } from "@/src/components/ui";
import { getContacts, getSites } from "@/src/database/repositories";
import { requirePanelAccess } from "@/src/auth/server";
export default async function Contacts() {
  const access = await requirePanelAccess();
  const [result, sites] = await Promise.all([getContacts(), getSites()]);
  return (
    <>
      <PageHeader
        eyebrow="Contactos"
        title="Audiencia"
        description="Gestiona las personas que pueden recibir tus campañas."
      />
      <ContactsView
        ready={result.ready}
        initial={result.contacts}
        sites={sites}
        canSuppress={access.platformOwner}
      />
    </>
  );
}
