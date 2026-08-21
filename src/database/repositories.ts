import type {
  Automation,
  Campaign,
  Contact,
  ContactInterest,
  Integration,
  Property,
  Site,
  SiteInvitation,
  SiteMember,
} from "@/src/domain/types";
import { cache } from "react";

export type ResendUsage = {
  todayCount?: number;
  dailyLimit?: number;
  monthCount?: number;
  monthlyLimit?: number;
  bySite?: Record<string, { todayCount: number; dailyLimit: number; monthCount: number; monthlyLimit: number }>;
};
import { createSupabaseAdmin } from "./supabase/server";
import { TokkoProvider } from "@/src/integrations/tokko/provider";
import { WordPressProvider } from "@/src/integrations/wordpress/provider";
import { getAccessContext } from "@/src/auth/server";
import {
  classifyProperty,
  inferSiteSegment,
} from "@/src/services/property-classifier";

const siteKey = (slug: string) => {
  const clean = String(slug || "").replace(/^area-/, "").toLowerCase();
  if (clean === "areaprime" || clean === "prime") return "prime";
  if (clean === "areahub" || clean === "hub") return "hub";
  if (clean === "arearetail" || clean === "retail") return "retail";
  return clean;
};
const slugOf = (siteId: string) => {
  const clean = String(siteId || "").toLowerCase();
  if (clean === "prime" || clean === "areaprime") return "area-areaprime";
  if (clean === "hub" || clean === "areahub") return "area-areahub";
  if (clean === "retail" || clean === "arearetail") return "area-arearetail";
  return `area-${clean}`;
};
const inBatches = <T>(items: T[], size = 400) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
const authorizedSiteUuids = async () => {
  const access = await getAccessContext();
  if (!access) return [] as string[];
  return access.platformOwner ? null : access.memberships.map((item) => item.siteUuid);
};
const requireDb = () => {
  const db = createSupabaseAdmin();
  if (!db) throw new Error("La base de datos no está configurada.");
  return db;
};
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Lima",
      })
        .format(new Date(value))
        .replace(",", " ·")
    : null;

export async function getAccessOverview(): Promise<{
  ready: boolean;
  members: SiteMember[];
  invitations: SiteInvitation[];
}> {
  const db = createSupabaseAdmin();
  if (!db) return { ready: false, members: [], invitations: [] };
  const allowed = await authorizedSiteUuids();
  let memberQuery = db.from("site_members").select("id,site_id,user_id,role,created_at,sites(slug)");
  let invitationQuery = db.from("invitations").select("id,site_id,email,role,status,expires_at,sites(slug)").order("created_at", { ascending: false });
  if (allowed) { memberQuery = memberQuery.in("site_id", allowed); invitationQuery = invitationQuery.in("site_id", allowed); }
  const [memberResult, invitationResult] = await Promise.all([
    memberQuery,
    invitationQuery,
  ]);
  const missing = [memberResult.error, invitationResult.error].some((error) => error?.code === "42P01" || error?.code === "PGRST205");
  if (missing) return { ready: false, members: [], invitations: [] };
  if (memberResult.error) throw memberResult.error;
  if (invitationResult.error) throw invitationResult.error;
  const userIds = [...new Set((memberResult.data ?? []).map((row) => row.user_id))];
  const profileResult = userIds.length ? await db.from("profiles").select("id,email,full_name").in("id", userIds) : { data: [], error: null };
  if (profileResult.error) throw profileResult.error;
  const profiles = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile]));
  const slugFrom = (relation: unknown) => Array.isArray(relation) ? relation[0]?.slug : (relation as { slug?: string } | null)?.slug;
  return {
    ready: true,
    members: (memberResult.data ?? []).map((row) => {
      const profile = profiles.get(row.user_id);
      return { id: row.id, siteId: siteKey(slugFrom(row.sites) ?? ""), userId: row.user_id, email: profile?.email ?? "", fullName: profile?.full_name ?? "", role: row.role, joinedAt: row.created_at };
    }),
    invitations: (invitationResult.data ?? []).map((row) => ({ id: row.id, siteId: siteKey(slugFrom(row.sites) ?? ""), email: row.email, role: row.role, status: row.status, expiresAt: row.expires_at })),
  };
}
const mapSite = (row: Record<string, unknown>): Site => ({
  id: siteKey(String(row.slug)),
  name: String(row.name),
  slug: String(row.slug),
  description: String(row.description ?? ""),
  businessType: String(row.business_type ?? ""),
  domain: String(row.domain ?? ""),
  wordpressUrl: String(row.wordpress_url ?? ""),
  logoUrl: String(row.logo_url ?? ""),
  primaryColor: String(row.primary_color),
  secondaryColor: String(row.secondary_color),
  senderName: String(row.sender_name ?? ""),
  senderEmail: String(row.sender_email ?? ""),
  timezone: String(row.timezone),
  isActive: Boolean(row.is_active),
  tokkoFilter: (row.tokko_filter ?? {}) as Record<string, unknown>,
});
const relatedSiteId = (row: Record<string, unknown>) =>
  siteKey(String((row.sites as { slug?: string } | null)?.slug ?? ""));

export const getSites = cache(async function getSites(): Promise<Site[]> {
  const db = createSupabaseAdmin();
  if (!db) return [];
  const allowed = await authorizedSiteUuids();
  let query = db.from("sites").select("*").order("created_at");
  if (allowed) query = query.in("id", allowed);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapSite);
});
const automationNames: Record<string, string> = {
  weekly_new_properties: "Alertas de nuevas propiedades",
  monthly_properties: "Resumen de propiedades disponibles",
  monthly_blog: "Noticias y artículos del blog",
};
const mapAutomation = (row: Record<string, unknown>): Automation => {
  const frequency = row.frequency as Automation["frequency"];
  return {
    id: String(row.id),
    siteId: relatedSiteId(row),
    type: row.type as Automation["type"],
    name: automationNames[String(row.type)] ?? String(row.type),
    isEnabled: Boolean(row.is_enabled),
    frequency,
    day: Number(frequency === "weekly" ? row.day_of_week : row.day_of_month),
    sendTime: String(row.send_time).slice(0, 5),
    requiresApproval: Boolean(row.requires_approval),
    nextRunAt: formatDate(row.next_run_at as string | null) ?? "Sin programar",
  };
};
export async function getAutomations(): Promise<Automation[]> {
  const db = createSupabaseAdmin();
  if (!db) return [];
  const allowed = await authorizedSiteUuids();
  let query = db
    .from("automation_settings")
    .select("*,sites!inner(slug)")
    .order("created_at");
  if (allowed) query = query.in("site_id", allowed);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapAutomation);
}
export async function getCampaigns(): Promise<Campaign[]> {
  const db = createSupabaseAdmin();
  if (!db) return [];
  const allowed = await authorizedSiteUuids();
  let query = db
    .from("campaigns")
    .select("*,sites!inner(slug)")
    .order("created_at", { ascending: false });
  if (allowed) query = query.in("site_id", allowed);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    siteId: relatedSiteId(row),
    automationType: row.automation_type,
    name: row.name,
    subject: row.subject,
    status: row.status,
    recipientCount: row.recipient_count,
    scheduledAt: formatDate(row.scheduled_at),
    sentAt: formatDate(row.sent_at),
    errorMessage: row.error_message ?? undefined,
    metadata: row.metadata ?? {},
  }));
}

export async function createCampaignDraft(input: {
  siteId: string;
  type: Automation["type"];
  name: string;
  subject: string;
  introduction: string;
  audienceInterest: ContactInterest;
  itemIds: string[];
  customRecipients?: string[];
  automation?: { id: string; scheduledFor: string; requiresApproval: boolean };
}) {
  const db = requireDb();
  const { data: site, error: siteError } = await db
    .from("sites")
    .select("id,slug")
    .eq("slug", slugOf(input.siteId))
    .single();
  if (siteError) throw siteError;

  let recipientCount = 0;
  const isCustom = Array.isArray(input.customRecipients) && input.customRecipients.length > 0;

  if (isCustom) {
    recipientCount = input.customRecipients!.length;
  } else {
    const { count, error: audienceError } = await db
      .from("contact_subscriptions")
      .select("contact_id,contacts!inner(status)", { count: "exact", head: true })
      .eq("site_id", site.id)
      .eq("interest", input.audienceInterest)
      .eq("contacts.status", "active");
    if (audienceError) throw audienceError;
    recipientCount = count || 0;
    if (!recipientCount)
      throw new Error("No hay contactos activos con consentimiento para esta audiencia.");
  }
  const isBlog = input.type === "monthly_blog";
  const limit = isBlog ? 5 : input.type === "weekly_new_properties" ? 5 : 10;
  const uniqueIds = [...new Set(input.itemIds)];
  if (!uniqueIds.length || uniqueIds.length > limit)
    throw new Error(`Selecciona entre 1 y ${limit} elementos.`);
  const table = isBlog ? "blog_posts" : "properties";
  const { data: records, error: recordsError } = await db
    .from(table)
    .select("*")
    .eq("site_id", site.id)
    .in("id", uniqueIds);
  if (recordsError) throw recordsError;
  if (records.length !== uniqueIds.length)
    throw new Error(
      "Uno o más elementos no pertenecen a la marca seleccionada.",
    );
  const ordered = uniqueIds.map(
    (id) => records.find((record) => record.id === id)!,
  );
  if (ordered.some((record) => !record.public_url))
    throw new Error(
      "Todo el contenido debe tener un enlace público antes de crear la campaña.",
    );
  const frozenAt = new Date().toISOString();
  const snapshots = ordered.map((record) =>
    isBlog
      ? {
          id: record.id,
          externalId: record.external_id,
          itemType: "blog_post" as const,
          title: record.title,
          excerpt: record.excerpt ?? "",
          imageUrl: record.image_url ?? "",
          publicUrl: record.public_url,
        }
      : {
          id: record.id,
          externalId: record.external_id,
          itemType: "property" as const,
          title: record.title,
          imageUrl: record.image_url ?? "",
          publicUrl: record.public_url,
          location: record.location ?? "",
          area: Number(record.area ?? 0),
          price: Number(record.price ?? 0),
          currency: record.currency ?? "USD",
        },
  );
  const { data: campaign, error } = await db
    .from("campaigns")
    .insert({
      site_id: site.id,
      automation_type: input.type,
      name: input.name.trim(),
      subject: input.subject.trim(),
      status: "draft",
      recipient_count: recipientCount,
      metadata: {
        introduction: input.introduction.trim(),
        frozenAt,
        audience: {
          interest: input.audienceInterest,
          count: recipientCount,
          capturedAt: frozenAt,
          customRecipients: isCustom ? input.customRecipients : undefined,
        },
        items: snapshots,
      },
    })
    .select("id")
    .single();
  if (error) throw error;
  const { error: itemsError } = await db.from("campaign_items").insert(
    ordered.map((record, position) => ({
      campaign_id: campaign.id,
      item_type: isBlog ? "blog_post" : "property",
      item_id: record.id,
      position,
    })),
  );
  if (itemsError) {
    await db.from("campaigns").delete().eq("id", campaign.id);
    throw itemsError;
  }
  return { id: campaign.id, itemCount: snapshots.length };
}

export async function approveCampaign(campaignId: string, approvedBy: string) {
  const db = requireDb();
  const { data: current, error: currentError } = await db
    .from("campaigns")
    .select("metadata,recipient_count,status")
    .eq("id", campaignId)
    .single();
  if (currentError) throw currentError;
  if (current.status !== "draft") throw new Error("Solo se pueden aprobar campañas en borrador.");
  if (!current.recipient_count) throw new Error("La campaña no tiene una audiencia válida.");
  const approvedAt = new Date().toISOString();
  const metadata = { ...(current.metadata ?? {}), approval: { approvedAt, approvedBy } };
  const { data, error } = await db
    .from("campaigns")
    .update({ status: "ready", metadata })
    .eq("id", campaignId)
    .eq("status", "draft")
    .select("id,status,metadata")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("La campaña fue modificada por otra sesión. Recarga e inténtalo de nuevo.");
  return data;
}

export async function refreshCampaignAudience(campaignId: string) {
  const db = requireDb();
  const { data: campaign, error: campaignError } = await db
    .from("campaigns")
    .select("site_id,metadata,status")
    .eq("id", campaignId)
    .single();
  if (campaignError) throw campaignError;
  if (campaign.status !== "draft") throw new Error("Solo se puede actualizar la audiencia de un borrador.");
  const interest = campaign.metadata?.audience?.interest as ContactInterest | undefined;
  if (!interest) throw new Error("La campaña no tiene un segmento de audiencia configurado.");
  const { count, error: countError } = await db
    .from("contact_subscriptions")
    .select("contacts!inner(id,status)", { count: "exact", head: true })
    .eq("site_id", campaign.site_id)
    .eq("interest", interest)
    .eq("contacts.status", "active");
  if (countError) throw countError;
  const recipientCount = count ?? 0;
  const metadata = { ...(campaign.metadata ?? {}), audience: { ...(campaign.metadata?.audience ?? {}), interest, count: recipientCount } };
  const { data, error } = await db
    .from("campaigns")
    .update({ recipient_count: recipientCount, metadata })
    .eq("id", campaignId)
    .select("id,recipient_count,metadata")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCampaign(campaignId: string) {
  const db = requireDb();
  await db.from("campaign_items").delete().eq("campaign_id", campaignId);
  const { error } = await db.from("campaigns").delete().eq("id", campaignId);
  if (error) throw error;
  return true;
}

export async function getIntegrations(): Promise<Integration[]> {
  const db = createSupabaseAdmin();
  if (!db) return [];
  const allowed = await authorizedSiteUuids();
  let query = db
    .from("site_integrations")
    .select("*,sites!inner(slug)")
    .order("created_at");
  if (allowed) query = query.in("site_id", allowed);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    siteId: relatedSiteId(row),
    provider: row.provider,
    status: row.status,
    lastSyncAt: formatDate(row.last_sync_at),
    lastError: row.last_error,
    config: row.config ?? {},
  }));
}
export async function getContacts(): Promise<{
  ready: boolean;
  contacts: Contact[];
}> {
  const db = createSupabaseAdmin();
  if (!db) return { ready: false, contacts: [] };
  const allowed = await authorizedSiteUuids();
  let query = db
    .from("contacts")
    .select("*,contact_subscriptions!inner(site_id,interest,sites(slug))")
    .order("created_at", { ascending: false });
  if (allowed) query = query.in("contact_subscriptions.site_id", allowed);
  const { data, error } = await query;
  if (error?.code === "42P01" || error?.code === "PGRST205")
    return { ready: false, contacts: [] };
  if (error) throw error;
  return {
    ready: true,
    contacts: data.map((row) => {
      const subscriptions = (row.contact_subscriptions ?? []) as Array<{
        interest: ContactInterest;
        sites?: { slug?: string } | null;
      }>;
      return {
        id: row.id,
        email: row.email,
        firstName: row.first_name ?? "",
        lastName: row.last_name ?? "",
        company: row.company ?? "",
        phone: row.phone ?? "",
        status: row.status,
        source: row.source,
        consentAt: row.consent_at,
        consentSource: row.consent_source ?? "",
        interests: [...new Set(subscriptions.map((item) => item.interest))],
        siteIds: [
          ...new Set(
            subscriptions
              .map((item) => (item.sites?.slug ? siteKey(item.sites.slug) : ""))
              .filter(Boolean),
          ),
        ],
      };
    }),
  };
}

export async function suppressContact(contactId: string) {
  const db = requireDb();
  const { data, error } = await db
    .from("contacts")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("id", contactId)
    .select("id,email,status,unsubscribed_at")
    .single();
  if (error) throw error;
  return data;
}

export async function suppressContactsBulk(contactIds: string[]) {
  if (!contactIds.length) return [];
  const db = requireDb();
  const { data, error } = await db
    .from("contacts")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .in("id", contactIds)
    .select("id,email,status,unsubscribed_at");
  if (error) throw error;
  return data ?? [];
}

export async function importContacts(input: {
  siteId: string;
  interest: ContactInterest;
  consentSource: string;
  consentConfirmed: boolean;
  rows: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
  }>;
}) {
  if (!input.consentConfirmed || !input.consentSource.trim())
    throw new Error("Confirma y describe el origen del consentimiento.");
  const db = requireDb();
  const { data: site, error: siteError } = await db
    .from("sites")
    .select("id")
    .eq("slug", slugOf(input.siteId))
    .single();
  if (siteError) throw siteError;
  const valid = new Map<string, (typeof input.rows)[number]>();
  let rejected = 0;
  for (const row of input.rows) {
    const email = row.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      rejected += 1;
      continue;
    }
    valid.set(email, { ...row, email });
  }
  if (!valid.size) throw new Error("No hay correos válidos para importar.");
  const emails = [...valid.keys()];
  const existing = [] as Array<{ id: string; email_normalized: string; status: string }>;
  for (const emailBatch of inBatches(emails)) {
    const { data, error: readError } = await db
      .from("contacts")
      .select("id,email_normalized,status")
      .in("email_normalized", emailBatch);
    if (readError) throw readError;
    existing.push(...(data ?? []));
  }
  const existingByEmail = new Map(
    existing.map((row) => [row.email_normalized, row]),
  );
  const now = new Date().toISOString();
  const rows = [...valid.values()].map((row) => ({
    email: row.email,
    first_name: row.firstName?.trim() || null,
    last_name: row.lastName?.trim() || null,
    company: row.company?.trim() || null,
    phone: row.phone?.trim() || null,
    source: "csv",
    consent_at: now,
    consent_source: input.consentSource.trim(),
  }));
  const saved = [] as Array<{ id: string; email_normalized: string; status: string }>;
  for (const rowBatch of inBatches(rows)) {
    const { data, error } = await db
      .from("contacts")
      .upsert(rowBatch, { onConflict: "email_normalized", ignoreDuplicates: false })
      .select("id,email_normalized,status");
    if (error) throw error;
    saved.push(...(data ?? []));
  }
  const eligible = saved.filter((row) => row.status === "active");
  if (eligible.length) {
    for (const eligibleBatch of inBatches(eligible)) {
      const { error: subscriptionError } = await db
        .from("contact_subscriptions")
        .upsert(
          eligibleBatch.map((row) => ({
          contact_id: row.id,
          site_id: site.id,
          interest: input.interest,
          })),
          { onConflict: "contact_id,site_id,interest" },
        );
      if (subscriptionError) throw subscriptionError;
    }
  }
  return {
    received: input.rows.length,
    valid: valid.size,
    created: emails.filter((email) => !existingByEmail.has(email)).length,
    updated: emails.filter((email) => existingByEmail.has(email)).length,
    rejected,
    suppressed: saved.filter((row) => row.status !== "active").length,
  };
}
export async function getProperties(): Promise<Property[]> {
  const db = createSupabaseAdmin();
  if (!db) return [];
  const allowed = await authorizedSiteUuids();
  let query = db
    .from("properties")
    .select("*,sites(slug)")
    .order("published_at", { ascending: false });
  if (allowed) query = query.in("site_id", allowed);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((row) => {
    const source = (row.source_data ?? {}) as Record<string, unknown>;
    const stored = source.segment;
    const segment =
      stored === "prime" || stored === "retail" || stored === "hub"
        ? stored
        : classifyProperty({
            propertyType: row.property_type ?? "",
            title: row.title,
          });
    return {
      id: row.id,
      siteId: segment === "prime" || segment === "hub" || segment === "retail" ? segment : (relatedSiteId(row) || "prime"),
      externalId: row.external_id,
      title: row.title,
      description: row.description ?? "",
      propertyType: row.property_type ?? "",
      location: row.location ?? "",
      address: row.address ?? "",
      price: Number(row.price ?? 0),
      currency: row.currency ?? "USD",
      area: Number(row.area ?? 0),
      imageUrl: row.image_url ?? "",
      publicUrl: row.public_url ?? "",
      status: row.status ?? "available",
      publishedAt: row.published_at ?? "",
      segment,
    };
  });
}
export async function getActivities() {
  const db = createSupabaseAdmin();
  if (!db) return [];
  const allowed = await authorizedSiteUuids();
  let query = db
    .from("sync_logs")
    .select("*,sites(slug)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (allowed) query = query.in("site_id", allowed);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((row) => ({
    date: formatDate(row.created_at) ?? "",
    siteId: relatedSiteId(row),
    provider: row.provider,
    operation: row.operation,
    status: row.status,
  }));
}

export async function getBlogPosts(): Promise<
  import("@/src/domain/types").BlogPost[]
> {
  const db = createSupabaseAdmin();
  if (!db) return [];
  const allowed = await authorizedSiteUuids();
  let query = db
    .from("blog_posts")
    .select("*,sites!inner(slug)")
    .order("published_at", { ascending: false });
  if (allowed) query = query.in("site_id", allowed);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    siteId: relatedSiteId(row),
    externalId: row.external_id,
    title: row.title,
    excerpt: row.excerpt ?? "",
    imageUrl: row.image_url ?? "",
    publicUrl: row.public_url ?? "",
    publishedAt: row.published_at ?? "",
  }));
}

export async function syncWordPressPosts(siteId: string) {
  const db = requireDb();
  const { data: row, error: siteError } = await db
    .from("sites")
    .select("*")
    .eq("slug", slugOf(siteId))
    .single();
  if (siteError) throw siteError;
  const site = mapSite(row);
  const startedAt = new Date().toISOString();
  try {
    const posts = await new WordPressProvider().getPosts(site);
    const { data: existing, error: existingError } = await db
      .from("blog_posts")
      .select("external_id")
      .eq("site_id", row.id);
    if (existingError) throw existingError;
    const known = new Set((existing ?? []).map((item) => item.external_id));
    const { error } = await db.from("blog_posts").upsert(
      posts.map((post) => ({
        site_id: row.id,
        external_id: post.externalId,
        title: post.title,
        excerpt: post.excerpt,
        image_url: post.imageUrl,
        public_url: post.publicUrl,
        published_at: post.publishedAt || null,
        source_data: {
          provider: "wordpress",
          synced_at: new Date().toISOString(),
        },
      })),
      { onConflict: "site_id,external_id" },
    );
    if (error) throw error;
    const now = new Date().toISOString();
    await db.from("site_integrations").upsert(
      {
        site_id: row.id,
        provider: "wordpress",
        status: "connected",
        config: {
          endpoint: `${site.wordpressUrl || `https://${site.domain}`}/wp-json/wp/v2/posts`,
        },
        last_sync_at: now,
        last_error: null,
      },
      { onConflict: "site_id,provider" },
    );
    await db.from("sync_logs").insert({
      site_id: row.id,
      provider: "wordpress",
      operation: "posts_sync",
      status: "success",
      started_at: startedAt,
      finished_at: now,
      items_received: posts.length,
      items_created: posts.filter((post) => !known.has(post.externalId)).length,
      items_updated: posts.filter((post) => known.has(post.externalId)).length,
    });
    return {
      received: posts.length,
      created: posts.filter((post) => !known.has(post.externalId)).length,
      updated: posts.filter((post) => known.has(post.externalId)).length,
    };
  } catch (cause) {
    await db.from("site_integrations").upsert(
      {
        site_id: row.id,
        provider: "wordpress",
        status: "error",
        config: {},
        last_error:
          cause instanceof Error ? cause.message : "Error desconocido",
      },
      { onConflict: "site_id,provider" },
    );
    await db.from("sync_logs").insert({
      site_id: row.id,
      provider: "wordpress",
      operation: "posts_sync",
      status: "error",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      error_message:
        cause instanceof Error ? cause.message : "Error desconocido",
    });
    throw cause;
  }
}

const toSiteRow = (site: Partial<Site>) => ({
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
  const db = requireDb();
  const { data: current, error: readError } = await db
    .from("sites")
    .select("*")
    .eq("slug", slugOf(id))
    .single();
  if (readError) throw readError;
  const updated = { ...mapSite(current), ...patch };
  const { error } = await db
    .from("sites")
    .update(toSiteRow(updated))
    .eq("id", current.id);
  if (error) throw error;
  return updated;
}
export async function createSite(input: {
  domain: string;
  name?: string;
  description?: string;
  businessType?: string;
  senderName?: string;
  senderEmail?: string;
}) {
  const db = requireDb();
  const domain = input.domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain))
    throw new Error("Ingresa un dominio válido, por ejemplo tudominio.com.");
  const key = domain
    .split(".")[0]
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const generatedName = key
    .split("-")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
  const name = input.name?.trim() || generatedName;
  const slug = `area-${key}`;
  const segment = inferSiteSegment({ slug, name });
  const { data, error } = await db
    .from("sites")
    .insert({
      name,
      slug,
      description: input.description?.trim() || "",
      business_type: input.businessType?.trim() || "",
      domain,
      sender_name: input.senderName?.trim() || name,
      sender_email: input.senderEmail?.trim() || `novedades@${domain}`,
      wordpress_url: "",
      logo_url: "",
      primary_color: "#2563EB",
      secondary_color: "#DBEAFE",
      timezone: "America/Lima",
      is_active: true,
      tokko_filter: segment === "unclassified" ? {} : { segment },
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapSite(data);
}
export async function syncTokkoProperties(siteId: string) {
  const db = requireDb();
  const { data: site, error: siteError } = await db
    .from("sites")
    .select("id,slug,name,domain,tokko_filter")
    .eq("slug", slugOf(siteId))
    .single();
  if (siteError) throw siteError;
  const { data: allSites, error: sitesError } = await db
    .from("sites")
    .select("id,slug,name,domain,tokko_filter");
  if (sitesError) throw sitesError;
  const sitesBySegment = new Map<string, (typeof allSites)[number]>();
  for (const item of allSites) {
    const segment = inferSiteSegment({
      slug: item.slug,
      name: item.name,
      tokkoFilter: item.tokko_filter,
    });
    if (segment !== "unclassified") sitesBySegment.set(segment, item);
  }
  const currentSegment = inferSiteSegment({
    slug: site.slug,
    name: site.name,
    tokkoFilter: site.tokko_filter,
  });
  const currentTemplate =
    typeof site.tokko_filter?.property_url_template === "string"
      ? site.tokko_filter.property_url_template
      : currentSegment === "prime" && site.domain
        ? `https://${site.domain}/ficha/?id={id}`
        : undefined;
  if (
    currentSegment !== "unclassified" &&
    (site.tokko_filter?.segment !== currentSegment ||
      (currentTemplate &&
        site.tokko_filter?.property_url_template !== currentTemplate))
  )
    await db
      .from("sites")
      .update({
        tokko_filter: {
          ...(site.tokko_filter ?? {}),
          segment: currentSegment,
          ...(currentTemplate
            ? { property_url_template: currentTemplate }
            : {}),
        },
      })
      .eq("id", site.id);
  const startedAt = new Date().toISOString();
  try {
    const provider = new TokkoProvider();
    const first = await provider.getPropertyPage({ limit: 50 });
    const pages = [first];
    for (let offset = 50; offset < first.total; offset += 50)
      pages.push(await provider.getPropertyPage({ limit: 50, offset }));
    const properties = pages.flatMap((page) => page.properties);
    const ids = properties.map((property) => property.externalId);
    const { data: existing, error: existingError } = await db
      .from("properties")
      .select("external_id")
      .in("external_id", ids);
    if (existingError) throw existingError;
    const known = new Set((existing ?? []).map((item) => item.external_id));
    const rows = properties.map((property) => {
      const segment = classifyProperty(property);
      const targetSite = sitesBySegment.get(segment);
      const storedTemplate = targetSite?.tokko_filter?.property_url_template;
      const urlTemplate =
        typeof storedTemplate === "string"
          ? storedTemplate
          : segment === "prime" && targetSite?.domain
            ? `https://${targetSite.domain}/ficha/?id={id}`
            : undefined;
      return {
        site_id: targetSite?.id ?? null,
        external_id: property.externalId,
        title: property.title,
        description: property.description,
        property_type: property.propertyType,
        location: property.location,
        address: property.address,
        price: property.price,
        currency: property.currency,
        area: property.area,
        image_url: property.imageUrl,
        public_url: urlTemplate
          ? urlTemplate.replace("{id}", encodeURIComponent(property.externalId))
          : null,
        status: property.status,
        published_at: property.publishedAt || null,
        last_seen_at: new Date().toISOString(),
        source_data: {
          provider: "tokko",
          segment,
          classification: "automatic",
          tokko_public_url: property.publicUrl,
        },
      };
    });
    const { error } = await db
      .from("properties")
      .upsert(rows, { onConflict: "external_id" });
    if (error) throw error;
    await db.from("site_integrations").upsert(
      {
        site_id: site.id,
        provider: "tokko",
        status: "connected",
        config: { segment: currentSegment },
        last_sync_at: new Date().toISOString(),
        last_error: null,
      },
      { onConflict: "site_id,provider" },
    );
    const assigned = rows.filter((row) => row.site_id === site.id).length;
    await db.from("sync_logs").insert({
      site_id: site.id,
      provider: "tokko",
      operation: "properties_sync",
      status: "success",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      items_received: properties.length,
      items_created: properties.filter(
        (property) => !known.has(property.externalId),
      ).length,
      items_updated: properties.filter((property) =>
        known.has(property.externalId),
      ).length,
      metadata: { segment: currentSegment, assigned },
    });
    return {
      received: properties.length,
      created: properties.filter((property) => !known.has(property.externalId))
        .length,
      updated: properties.filter((property) => known.has(property.externalId))
        .length,
      assigned,
    };
  } catch (cause) {
    await db.from("sync_logs").insert({
      site_id: site.id,
      provider: "tokko",
      operation: "properties_sync",
      status: "error",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      error_message:
        cause instanceof Error ? cause.message : "Error desconocido",
    });
    throw cause;
  }
}
export async function updateAutomation(id: string, patch: Partial<Automation>) {
  const db = requireDb();
  const payload: Record<string, unknown> = {};
  if (patch.isEnabled !== undefined) payload.is_enabled = patch.isEnabled;
  if (patch.frequency) payload.frequency = patch.frequency;
  if (patch.day !== undefined) {
    const frequency = patch.frequency;
    if (!frequency)
      throw new Error("La frecuencia es obligatoria para cambiar el día.");
    payload.day_of_week = frequency === "weekly" ? patch.day : null;
    payload.day_of_month = frequency === "monthly" ? patch.day : null;
  }
  if (patch.sendTime) payload.send_time = patch.sendTime;
  if (patch.requiresApproval !== undefined)
    payload.requires_approval = patch.requiresApproval;
  const { data, error } = await db
    .from("automation_settings")
    .update(payload)
    .eq("id", id)
    .select("*,sites!inner(slug)")
    .single();
  if (error) throw error;
  return mapAutomation(data);
}
export async function createAutomation(
  input: Pick<
    Automation,
    "siteId" | "type" | "frequency" | "day" | "sendTime" | "requiresApproval"
  >,
) {
  const db = requireDb();
  const { data: site, error: siteError } = await db
    .from("sites")
    .select("id")
    .eq("slug", slugOf(input.siteId))
    .single();
  if (siteError) throw siteError;
  const { data, error } = await db
    .from("automation_settings")
    .insert({
      site_id: site.id,
      type: input.type,
      frequency: input.frequency,
      day_of_week: input.frequency === "weekly" ? input.day : null,
      day_of_month: input.frequency === "monthly" ? input.day : null,
      send_time: input.sendTime,
      requires_approval: input.requiresApproval,
      is_enabled: false,
    })
    .select("*,sites!inner(slug)")
    .single();
  if (error) throw error;
  return mapAutomation(data);
}
export async function addCampaigns(items: Campaign[]) {
  const db = requireDb();
  const sites = await db.from("sites").select("id,slug");
  if (sites.error) throw sites.error;
  const ids = new Map(sites.data.map((s) => [siteKey(s.slug), s.id]));
  const { error } = await db.from("campaigns").insert(
    items.map((item) => ({
      site_id: ids.get(item.siteId),
      automation_type: item.automationType,
      name: item.name,
      subject: item.subject,
      status: item.status,
      recipient_count: item.recipientCount,
      scheduled_at: item.scheduledAt,
      sent_at: item.sentAt,
      error_message: item.errorMessage,
    })),
  );
  if (error) throw error;
  return items;
}
export async function recordOutboundEmail(input: {
  resendId: string;
  to: string;
  from: string;
  subject: string;
  status?: string;
  html?: string;
}) {
  const db = createSupabaseAdmin();
  if (!db) return;
  const { error } = await db.from("outbound_emails").upsert(
    {
      resend_email_id: input.resendId,
      recipient: input.to,
      sender: input.from,
      subject: input.subject,
      status: input.status ?? "sent",
      sent_at: new Date().toISOString(),
      metadata: input.html ? { html: input.html } : undefined,
    },
    { onConflict: "resend_email_id" },
  );
  if (error) throw error;
}
export async function recordResendEvent(event: {
  id: string;
  type: string;
  createdAt: string;
  emailId?: string;
  payload: unknown;
}) {
  const db = requireDb();
  const { error } = await db.from("email_events").upsert(
    {
      resend_event_id: event.id,
      resend_email_id: event.emailId ?? null,
      event_type: event.type,
      occurred_at: event.createdAt,
      payload: event.payload,
    },
    { onConflict: "resend_event_id" },
  );
  if (error) throw error;
  if (event.emailId)
    await db
      .from("outbound_emails")
      .update({
        status: event.type.replace(/^email\./, ""),
        last_event_at: event.createdAt,
      })
      .eq("resend_email_id", event.emailId);
}
export async function getOutboundEmails() {
  const db = createSupabaseAdmin();
  if (!db) return [];
  const allowed = await authorizedSiteUuids();
  let query = db
    .from("outbound_emails")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(250);
  if (allowed) query = query.in("site_id", allowed);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((row) => ({
    id: row.resend_email_id,
    to: row.recipient,
    from: row.sender,
    subject: row.subject,
    date: row.sent_at,
    status: row.status,
    errorMessage: row.metadata?.error_message,
    html: row.metadata?.html,
    siteId: row.site_id,
    events: row.status === "delivered" || row.status === "sent" ? ["email.delivered"] : [],
  }));
}

export async function getResendUsage(): Promise<{
  todayCount: number;
  dailyLimit: number;
  monthCount: number;
  monthlyLimit: number;
}> {
  const db = createSupabaseAdmin();
  if (!db) {
    return { todayCount: 0, dailyLimit: 100, monthCount: 0, monthlyLimit: 3000 };
  }
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [todayRes, monthRes] = await Promise.all([
    db.from("outbound_emails").select("id", { count: "exact", head: true }).gte("sent_at", startOfDay),
    db.from("outbound_emails").select("id", { count: "exact", head: true }).gte("sent_at", startOfMonth),
  ]);

  return {
    todayCount: todayRes.count ?? 0,
    dailyLimit: 100,
    monthCount: monthRes.count ?? 0,
    monthlyLimit: 3000,
  };
}

export async function getEmailPerformanceList(): Promise<import("@/src/domain/types").OutboundEmailRecord[]> {
  const db = createSupabaseAdmin();
  if (!db) return [];
  const allowed = await authorizedSiteUuids();
  let query = db
    .from("outbound_emails")
    .select("id, campaign_id, site_id, resend_email_id, recipient, sender, subject, status, sent_at, last_event_at, metadata, sites(id, name, slug, primary_color)")
    .order("sent_at", { ascending: false })
    .limit(250);
  if (allowed) query = query.in("site_id", allowed);

  const { data: emails, error } = await query;
  if (error) {
    console.error("Error al obtener correos salientes:", error);
    return [];
  }

  if (!emails || emails.length === 0) return [];

  const resendIds = emails.map((e) => e.resend_email_id).filter(Boolean);
  const { data: events } = resendIds.length
    ? await db.from("email_events").select("resend_email_id, event_type").in("resend_email_id", resendIds)
    : { data: [] };

  const eventsByEmailId = new Map<string, string[]>();
  for (const ev of events ?? []) {
    if (!ev.resend_email_id) continue;
    const list = eventsByEmailId.get(ev.resend_email_id) || [];
    list.push(ev.event_type);
    eventsByEmailId.set(ev.resend_email_id, list);
  }

  return emails.map((row) => {
    const evList = eventsByEmailId.get(row.resend_email_id) || [];
    const isDelivered = row.status === "delivered" || row.status === "sent" || evList.includes("email.delivered");
    const isBounced = row.status === "bounced" || evList.includes("email.bounced");
    const isClicked = evList.includes("email.clicked") || evList.includes("email.opened");
    const isUnsubscribed = evList.includes("email.unsubscribed");
    const isSpam = evList.includes("email.complained");

    const siteRel = Array.isArray(row.sites) ? row.sites[0] : row.sites;

    return {
      id: row.id,
      resendId: row.resend_email_id,
      recipient: row.recipient,
      sender: row.sender,
      subject: row.subject,
      date: row.sent_at,
      status: row.status,
      siteId: row.site_id,
      campaignId: row.campaign_id,
      sentCount: 1,
      clickRate: isClicked ? 100 : 0,
      deliveredRate: isBounced ? 0 : isDelivered ? 100 : 95,
      unsubscribedRate: isUnsubscribed ? 100 : 0,
      spamRate: isSpam ? 100 : 0,
      siteName: siteRel?.name,
      siteColor: siteRel?.primary_color,
    };
  });
}

export async function getCampaignRecipients(campaignId: string): Promise<string[]> {
  const db = requireDb();
  const { data: campaign, error: campaignError } = await db
    .from("campaigns")
    .select("site_id,metadata")
    .eq("id", campaignId)
    .single();
  if (campaignError) throw campaignError;
  
  const audience = campaign.metadata?.audience;
  if (!audience) return [];
  
  if (Array.isArray(audience.customRecipients) && audience.customRecipients.length > 0) {
    return audience.customRecipients;
  }
  
  const { data, error } = await db
    .from("contact_subscriptions")
    .select("contacts!inner(email,status)")
    .eq("site_id", campaign.site_id)
    .eq("interest", audience.interest)
    .eq("contacts.status", "active");
  if (error) throw error;
  
  return data.map((row: any) => row.contacts.email).filter(Boolean);
}

export async function markCampaignSent(campaignId: string, resendBroadcastId: string) {
  const db = requireDb();
  const { data, error } = await db
    .from("campaigns")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      resend_broadcast_id: resendBroadcastId,
    })
    .eq("id", campaignId)
    .select("id,status")
    .single();
  if (error) throw error;
  return data;
}

