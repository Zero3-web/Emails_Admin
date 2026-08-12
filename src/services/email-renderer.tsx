import { render } from "react-email";
import type { AutomationType, Site } from "@/src/domain/types";
import { MonthlyBlogEmail } from "@/emails/MonthlyBlogEmail";
import { MonthlyPropertiesEmail } from "@/emails/MonthlyPropertiesEmail";
import { WeeklyPropertiesEmail } from "@/emails/WeeklyPropertiesEmail";
import { posts, properties } from "@/src/data/mock";

export async function renderCampaignEmail(site: Site, type: AutomationType) {
  if (type === "monthly_blog")
    return render(
      <MonthlyBlogEmail
        site={site}
        posts={posts.filter((p) => p.siteId === site.id).slice(0, 5)}
      />,
    );
  const items = properties
    .filter((p) => p.siteId === site.id)
    .slice(0, type === "weekly_new_properties" ? 5 : 10);
  return render(
    type === "weekly_new_properties" ? (
      <WeeklyPropertiesEmail site={site} properties={items} />
    ) : (
      <MonthlyPropertiesEmail site={site} properties={items} />
    ),
  );
}
