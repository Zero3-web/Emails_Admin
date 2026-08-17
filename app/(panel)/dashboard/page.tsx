import { DashboardView } from "@/src/components/dashboard/dashboard-view";
import { getCampaigns, getContacts, getEmailPerformanceList, getSites } from "@/src/database/repositories";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const { site } = await searchParams;
  const [sites, campaigns, contactResult, emailList] = await Promise.all([
    getSites(),
    getCampaigns(),
    getContacts(),
    getEmailPerformanceList(),
  ]);

  const visibleSites = site ? sites.filter((item) => item.id === site) : sites;
  const allowedSiteIds = new Set(visibleSites.map((item) => item.id));
  const visibleCampaigns = campaigns.filter((item) => allowedSiteIds.has(item.siteId));
  const visibleContacts = contactResult.contacts.filter((item) => item.siteIds.some((id) => allowedSiteIds.has(id)));
  const activeContacts = visibleContacts.filter((item) => item.status === "active").length;

  const visibleEmails = site
    ? emailList.filter((item) => !item.siteId || allowedSiteIds.has(item.siteId))
    : emailList;

  const campaignDelivered = visibleCampaigns
    .filter((item) => item.status === "sent")
    .reduce((sum, item) => sum + item.recipientCount, 0);
  const emailDelivered = visibleEmails.filter(
    (item) => item.status === "sent" || item.status === "delivered"
  ).length;
  const totalDelivered = campaignDelivered + emailDelivered;

  return (
    <DashboardView
      sites={visibleSites}
      campaigns={visibleCampaigns}
      emails={visibleEmails}
      totalDelivered={totalDelivered}
      activeContacts={activeContacts}
    />
  );
}
