-- User-isolated workspaces: private audiences, campaigns, automations, and outbound history per user
-- while maintaining shared sites, property catalogs, and blog posts.

-- 1. Add user_id to contacts, subscriptions, campaigns, outbound_emails, and automations
alter table public.contacts
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.contact_subscriptions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.campaigns
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.outbound_emails
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.automation_settings
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2. Populate existing records with admin user ID 
do $$
declare
  target_admin_id uuid := '5c83e75f-cf67-4c78-b603-768a0be63179';
begin
  if exists (select 1 from auth.users where id = target_admin_id) then
    update public.contacts set user_id = target_admin_id where user_id is null;
    update public.contact_subscriptions set user_id = target_admin_id where user_id is null;
    update public.campaigns set user_id = target_admin_id where user_id is null;
    update public.outbound_emails set user_id = target_admin_id where user_id is null;
    update public.automation_settings set user_id = target_admin_id where user_id is null;
  end if;
end $$;

-- 3. Adjust unique constraint on contacts to be per-user
alter table public.contacts
  drop constraint if exists contacts_email_normalized_key;

alter table public.contacts
  drop constraint if exists contacts_user_email_normalized_key;

alter table public.contacts
  add constraint contacts_user_email_normalized_key unique (user_id, email_normalized);

-- 4. Adjust unique constraint on automation_settings to be per-user per-site per-type
alter table public.automation_settings
  drop constraint if exists automation_settings_site_id_type_key;

alter table public.automation_settings
  drop constraint if exists automation_settings_user_site_type_key;

alter table public.automation_settings
  add constraint automation_settings_user_site_type_key unique (user_id, site_id, type);

-- 5. Indexes for fast per-user lookups
create index if not exists contacts_user_id_idx on public.contacts(user_id);
create index if not exists contact_subs_user_id_idx on public.contact_subscriptions(user_id);
create index if not exists campaigns_user_id_idx on public.campaigns(user_id);
create index if not exists outbound_emails_user_id_idx on public.outbound_emails(user_id);
create index if not exists automation_settings_user_id_idx on public.automation_settings(user_id);

-- 6. Row Level Security policies per user
drop policy if exists admin_contacts on contacts;
drop policy if exists contacts_read on contacts;
drop policy if exists contacts_insert on contacts;
drop policy if exists contacts_update on contacts;
drop policy if exists contacts_delete on contacts;

create policy contacts_read on contacts for select to authenticated using (user_id = auth.uid());
create policy contacts_insert on contacts for insert to authenticated with check (user_id = auth.uid());
create policy contacts_update on contacts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy contacts_delete on contacts for delete to authenticated using (user_id = auth.uid());

drop policy if exists admin_contact_subscriptions on contact_subscriptions;
drop policy if exists subscriptions_read on contact_subscriptions;
create policy subscriptions_read on contact_subscriptions for select to authenticated using (user_id = auth.uid());

drop policy if exists campaigns_read on campaigns;
drop policy if exists campaigns_create on campaigns;
drop policy if exists campaigns_update on campaigns;

create policy campaigns_read on campaigns for select to authenticated using (user_id = auth.uid());
create policy campaigns_create on campaigns for insert to authenticated with check (user_id = auth.uid());
create policy campaigns_update on campaigns for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists outbound_read on outbound_emails;
create policy outbound_read on outbound_emails for select to authenticated using (user_id = auth.uid());

drop policy if exists automations_read on automation_settings;
drop policy if exists automations_manage on automation_settings;
create policy automations_read on automation_settings for select to authenticated using (user_id = auth.uid());
create policy automations_manage on automation_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
