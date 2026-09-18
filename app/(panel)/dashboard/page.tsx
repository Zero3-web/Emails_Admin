import { DashboardView } from "@/src/components/dashboard/dashboard-view";
import {
  getBlogPosts,
  getContacts,
  getProperties,
  getSites,
} from "@/src/database/repositories";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const { site } = await searchParams;
  const [sites, properties, posts, contactResult] = await Promise.all([
    getSites(),
    getProperties(),
    getBlogPosts(),
    getContacts(),
  ]);

  const visibleSites = site ? sites.filter((item) => item.id === site) : sites;

  return (
    <DashboardView
      sites={sites}
      selectedSiteId={site}
      properties={properties}
      posts={posts}
      contacts={contactResult.contacts}
      contactsReady={contactResult.ready}
    />
  );
}
