import {
  automations as seedAutomations,
  campaigns as seedCampaigns,
  sites as seedSites,
} from "@/src/data/mock";
import type { Automation, Campaign, Site } from "@/src/domain/types";
import { createSupabaseAdmin } from "./supabase/server";

const mockState = {
  sites: structuredClone(seedSites),
  automations: structuredClone(seedAutomations),
  campaigns: structuredClone(seedCampaigns),
};

const toSiteRow = (site: Site) => ({
  name: site.name,
  slug: site.slug,
  description: site.description,
  business_type: site.businessType,
  domain: site.domain,
  wordpress_url: site.wordpressUrl,
  logo_url: site.logoUrl,
  primary_color: site.primaryColor,
  secondary_color: site.secondaryColor,
  sender_name: site.senderName,
  sender_email: site.senderEmail,
  timezone: site.timezone,
  is_active: site.isActive,
  tokko_filter: site.tokkoFilter,
});

export async function updateSite(id: string, patch: Partial<Site>) {
  const index = mockState.sites.findIndex((site) => site.id === id);
  if (index < 0) throw new Error("Site not found");
  mockState.sites[index] = { ...mockState.sites[index], ...patch };
  const supabase = createSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase
      .from("sites")
      .update(toSiteRow(mockState.sites[index]))
      .eq("slug", mockState.sites[index].slug);
    if (error) throw error;
  }
  return mockState.sites[index];
}

export async function updateAutomation(id: string, patch: Partial<Automation>) {
  const index = mockState.automations.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Automation not found");
  mockState.automations[index] = { ...mockState.automations[index], ...patch };
  const supabase = createSupabaseAdmin();
  if (supabase) {
    const automation = mockState.automations[index];
    const { error } = await supabase
      .from("automation_settings")
      .update({
        is_enabled: automation.isEnabled,
        frequency: automation.frequency,
        day_of_week: automation.frequency === "weekly" ? automation.day : null,
        day_of_month:
          automation.frequency === "monthly" ? automation.day : null,
        send_time: automation.sendTime,
        requires_approval: automation.requiresApproval,
      })
      .eq("type", automation.type);
    if (error) throw error;
  }
  return mockState.automations[index];
}

export function addCampaigns(items: Campaign[]) {
  mockState.campaigns.unshift(...items);
  return items;
}
