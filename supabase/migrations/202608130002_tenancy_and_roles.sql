-- Multi-site stewardship: identities, memberships, invitations and audit trail.
do $$ begin
  create type public.platform_role as enum ('platform_owner', 'user');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.site_role as enum ('site_admin', 'editor', 'approver', 'viewer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  platform_role public.platform_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_members (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.site_role not null,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  email text not null,
  role public.site_role not null,
  token_hash text not null unique,
  status public.invitation_status not null default 'pending',
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(site_id, email, status)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists site_members_user_idx on public.site_members(user_id, site_id);
create index if not exists invitations_email_idx on public.invitations(lower(email), status);
create index if not exists audit_logs_site_created_idx on public.audit_logs(site_id, created_at desc);
drop trigger if exists profiles_updated_at on public.profiles;
drop trigger if exists site_members_updated_at on public.site_members;
create trigger profiles_updated_at before update on public.profiles for each row execute function set_updated_at();
create trigger site_members_updated_at before update on public.site_members for each row execute function set_updated_at();

create or replace function public.is_platform_owner()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from profiles where id = auth.uid() and platform_role = 'platform_owner') $$;

create or replace function public.site_role_for(target_site uuid)
returns public.site_role language sql stable security definer set search_path = public
as $$ select role from site_members where user_id = auth.uid() and site_id = target_site limit 1 $$;

create or replace function public.can_access_site(target_site uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select is_platform_owner() or site_role_for(target_site) is not null $$;

create or replace function public.can_manage_site(target_site uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select is_platform_owner() or site_role_for(target_site) = 'site_admin' $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into profiles(id,email,full_name) values(new.id,coalesce(new.email,''),new.raw_user_meta_data->>'full_name') on conflict(id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.site_members enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_read_self_or_owner on profiles;
drop policy if exists profiles_update_self on profiles;
drop policy if exists memberships_read on site_members;
drop policy if exists memberships_manage on site_members;
drop policy if exists invitations_manage on invitations;
drop policy if exists audit_read on audit_logs;
drop policy if exists audit_insert on audit_logs;
create policy profiles_read_self_or_owner on profiles for select to authenticated using (id = auth.uid() or is_platform_owner());
create policy profiles_update_self on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy memberships_read on site_members for select to authenticated using (user_id = auth.uid() or can_manage_site(site_id));
create policy memberships_manage on site_members for all to authenticated using (can_manage_site(site_id)) with check (can_manage_site(site_id));
create policy invitations_manage on invitations for all to authenticated using (can_manage_site(site_id)) with check (can_manage_site(site_id));
create policy audit_read on audit_logs for select to authenticated using (can_access_site(site_id));
create policy audit_insert on audit_logs for insert to authenticated with check (actor_id = auth.uid() and can_access_site(site_id));

drop policy if exists admin_sites on sites;
drop policy if exists admin_integrations on site_integrations;
drop policy if exists admin_properties on properties;
drop policy if exists admin_posts on blog_posts;
drop policy if exists admin_automations on automation_settings;
drop policy if exists admin_campaigns on campaigns;
drop policy if exists admin_campaign_items on campaign_items;
drop policy if exists admin_sync_logs on sync_logs;
drop policy if exists admin_contacts on contacts;
drop policy if exists admin_contact_subscriptions on contact_subscriptions;
drop policy if exists admin_outbound_emails on outbound_emails;
drop policy if exists admin_email_events on email_events;

drop policy if exists sites_read on sites;
drop policy if exists sites_update on sites;
drop policy if exists integrations_read on site_integrations;
drop policy if exists properties_read on properties;
drop policy if exists posts_read on blog_posts;
drop policy if exists automations_read on automation_settings;
drop policy if exists automations_manage on automation_settings;
drop policy if exists campaigns_read on campaigns;
drop policy if exists campaigns_create on campaigns;
drop policy if exists campaigns_update on campaigns;
drop policy if exists campaign_items_read on campaign_items;
drop policy if exists sync_logs_read on sync_logs;
drop policy if exists subscriptions_read on contact_subscriptions;
drop policy if exists contacts_read on contacts;
drop policy if exists outbound_read on outbound_emails;
drop policy if exists email_events_read on email_events;
create policy sites_read on sites for select to authenticated using (can_access_site(id));
create policy sites_update on sites for update to authenticated using (can_manage_site(id)) with check (can_manage_site(id));
create policy integrations_read on site_integrations for select to authenticated using (can_access_site(site_id));
create policy properties_read on properties for select to authenticated using (site_id is not null and can_access_site(site_id));
create policy posts_read on blog_posts for select to authenticated using (can_access_site(site_id));
create policy automations_read on automation_settings for select to authenticated using (can_access_site(site_id));
create policy automations_manage on automation_settings for all to authenticated using (can_manage_site(site_id)) with check (can_manage_site(site_id));
create policy campaigns_read on campaigns for select to authenticated using (can_access_site(site_id));
create policy campaigns_create on campaigns for insert to authenticated with check (can_manage_site(site_id) or site_role_for(site_id) = 'editor');
create policy campaigns_update on campaigns for update to authenticated using (can_manage_site(site_id) or site_role_for(site_id) in ('editor','approver')) with check (can_access_site(site_id));
create policy campaign_items_read on campaign_items for select to authenticated using (exists(select 1 from campaigns c where c.id = campaign_id and can_access_site(c.site_id)));
create policy sync_logs_read on sync_logs for select to authenticated using (site_id is not null and can_access_site(site_id));
create policy subscriptions_read on contact_subscriptions for select to authenticated using (can_access_site(site_id));
create policy contacts_read on contacts for select to authenticated using (exists(select 1 from contact_subscriptions cs where cs.contact_id = contacts.id and can_access_site(cs.site_id)));
create policy outbound_read on outbound_emails for select to authenticated using (site_id is not null and can_access_site(site_id));
create policy email_events_read on email_events for select to authenticated using (exists(select 1 from outbound_emails oe where oe.resend_email_id = email_events.resend_email_id and can_access_site(oe.site_id)));

revoke execute on function public.is_platform_owner() from public, anon;
revoke execute on function public.site_role_for(uuid) from public, anon;
revoke execute on function public.can_access_site(uuid) from public, anon;
revoke execute on function public.can_manage_site(uuid) from public, anon;
grant execute on function public.is_platform_owner() to authenticated, service_role;
grant execute on function public.site_role_for(uuid) to authenticated, service_role;
grant execute on function public.can_access_site(uuid) to authenticated, service_role;
grant execute on function public.can_manage_site(uuid) to authenticated, service_role;
