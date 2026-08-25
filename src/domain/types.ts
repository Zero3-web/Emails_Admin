export type IntegrationProvider = "tokko" | "wordpress" | "resend";
export type IntegrationStatus = "pending" | "connected" | "error" | "disabled";
export type AutomationType =
  | "weekly_new_properties"
  | "monthly_properties"
  | "monthly_blog";
export type CampaignStatus =
  | "draft"
  | "ready"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";
export interface Site {
  id: string;
  name: string;
  slug: string;
  description: string;
  businessType: string;
  domain: string;
  wordpressUrl: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  senderName: string;
  senderEmail: string;
  timezone: string;
  isActive: boolean;
  tokkoFilter: Record<string, unknown>;
}
export interface Property {
  id: string;
  siteId: string;
  externalId: string;
  title: string;
  description: string;
  propertyType: string;
  location: string;
  address: string;
  price: number;
  currency: string;
  area: number;
  imageUrl: string;
  publicUrl: string;
  status: string;
  publishedAt: string;
  segment: "prime" | "retail" | "hub" | "unclassified";
}
export interface BlogPost {
  id: string;
  siteId: string;
  externalId: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  publicUrl: string;
  publishedAt: string;
}
export interface Campaign {
  id: string;
  siteId: string;
  automationType: AutomationType;
  name: string;
  subject: string;
  status: CampaignStatus;
  recipientCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  errorMessage?: string;
  metadata?: {
    introduction?: string;
    frozenAt?: string;
    audience?: {
      interest: ContactInterest;
      count: number;
      capturedAt: string;
    };
    approval?: {
      approvedAt: string;
      approvedBy: string;
    };
    items?: Array<{
      id: string;
      externalId: string;
      itemType: "property" | "blog_post";
      title: string;
      excerpt?: string;
      imageUrl: string;
      publicUrl: string;
      location?: string;
      area?: number;
      price?: number;
      currency?: string;
    }>;
  };
}
export interface Automation {
  id: string;
  siteId: string;
  type: AutomationType;
  name: string;
  isEnabled: boolean;
  frequency: "weekly" | "monthly";
  day: number;
  sendTime: string;
  requiresApproval: boolean;
  nextRunAt: string;
  customRecipients?: string[];
}
export interface Integration {
  id: string;
  siteId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  config: Record<string, unknown>;
}
export type ContactStatus =
  | "active"
  | "unsubscribed"
  | "bounced"
  | "complained"
  | "blocked";
export type ContactInterest = "prime" | "retail" | "hub";
export interface Contact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  status: ContactStatus;
  source: string;
  consentAt: string | null;
  consentSource: string;
  interests: ContactInterest[];
  siteIds: string[];
}
export type PlatformRole = "platform_owner" | "user";
export type SiteRole = "site_admin" | "editor" | "approver" | "viewer";
export interface SiteMember {
  id: string;
  siteId: string;
  userId: string;
  email: string;
  fullName: string;
  role: SiteRole;
  joinedAt: string;
}
export interface SiteInvitation {
  id: string;
  siteId: string;
  email: string;
  role: SiteRole;
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: string;
}

export interface OutboundEmailRecord {
  id: string;
  resendId: string;
  recipient: string;
  sender: string;
  subject: string;
  date: string;
  status: string;
  siteId: string | null;
  campaignId: string | null;
  sentCount: number;
  clickRate: number;
  deliveredRate: number;
  unsubscribedRate: number;
  spamRate: number;
  siteName?: string;
  siteColor?: string;
}

