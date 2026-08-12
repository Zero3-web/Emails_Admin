import {
  getBlogProvider,
  getPropertyProvider,
} from "@/src/integrations/factory";
import { sites } from "@/src/data/mock";
import { createCampaign } from "@/src/services/campaigns";
import { addCampaigns } from "@/src/database/repositories";
import { renderCampaignEmail } from "@/src/services/email-renderer";
export const taskNames = [
  "sync-properties",
  "sync-blog-posts",
  "generate-weekly-properties",
  "generate-monthly-properties",
  "generate-monthly-blog",
] as const;
export async function runMockTask(name: (typeof taskNames)[number]) {
  if (name === "sync-properties") return getPropertyProvider().getProperties();
  if (name === "sync-blog-posts")
    return Promise.all(sites.map((s) => getBlogProvider().getPosts(s)));
  const type =
    name === "generate-weekly-properties"
      ? "weekly_new_properties"
      : name === "generate-monthly-properties"
        ? "monthly_properties"
        : "monthly_blog";
  const generated = sites.map((s) => createCampaign(s, type));
  await Promise.all(sites.map((s) => renderCampaignEmail(s, type)));
  return addCampaigns(generated);
}
