export type IntegrationProvider = "tokko" | "wordpress" | "resend";
export type IntegrationStatus = "pending" | "connected" | "error" | "disabled";
export type AutomationType = "weekly_new_properties" | "monthly_properties" | "monthly_blog";
export type CampaignStatus = "draft" | "ready" | "scheduled" | "sending" | "sent" | "failed" | "cancelled";
export interface Site { id:string; name:string; slug:string; description:string; businessType:string; domain:string; wordpressUrl:string; logoUrl:string; primaryColor:string; secondaryColor:string; senderName:string; senderEmail:string; timezone:string; isActive:boolean; tokkoFilter:Record<string,unknown>; }
export interface Property { id:string; siteId:string; externalId:string; title:string; description:string; propertyType:string; location:string; address:string; price:number; currency:string; area:number; imageUrl:string; publicUrl:string; status:string; publishedAt:string; }
export interface BlogPost { id:string; siteId:string; externalId:string; title:string; excerpt:string; imageUrl:string; publicUrl:string; publishedAt:string; }
export interface Campaign { id:string; siteId:string; automationType:AutomationType; name:string; subject:string; status:CampaignStatus; recipientCount:number; scheduledAt:string|null; sentAt:string|null; errorMessage?:string; }
export interface Automation { id:string; siteId:string; type:AutomationType; name:string; isEnabled:boolean; frequency:"weekly"|"monthly"; day:number; sendTime:string; requiresApproval:boolean; nextRunAt:string; }
export interface Integration { id:string; siteId:string; provider:IntegrationProvider; status:IntegrationStatus; lastSyncAt:string|null; lastError:string|null; config:Record<string,unknown>; }
