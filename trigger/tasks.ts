import { getBlogProvider, getPropertyProvider } from "@/src/integrations/factory";
import { getBlogPosts, getProperties, getSites, addCampaigns } from "@/src/database/repositories";
import { createCampaign } from "@/src/services/campaigns";
import { renderCampaignEmail } from "@/src/services/email-renderer";

export const taskNames = ["sync-properties", "sync-blog-posts", "generate-weekly-properties", "generate-monthly-properties", "generate-monthly-blog"] as const;
export async function runTask(name: (typeof taskNames)[number]) {
  const sites = await getSites(); if (!sites.length) throw new Error("No hay sitios persistidos.");
  if (name === "sync-properties") return getPropertyProvider().getProperties();
  if (name === "sync-blog-posts") return Promise.all(sites.map((site) => getBlogProvider().getPosts(site)));
  const type = name === "generate-weekly-properties" ? "weekly_new_properties" : name === "generate-monthly-properties" ? "monthly_properties" : "monthly_blog";
  const generated = sites.map((site) => createCampaign(site, type));
  const content = type === "monthly_blog" ? await getBlogPosts() : await getProperties();
  const limit = type === "weekly_new_properties" ? 5 : type === "monthly_properties" ? 10 : 5;
  await Promise.all(sites.map((site) => renderCampaignEmail(site, type, content.filter((item) => item.siteId === site.id && (type === "monthly_blog" || Boolean(item.publicUrl))).slice(0, limit))));
  return addCampaigns(generated);
}
