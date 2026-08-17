-- Make permission checks always return a boolean, including for anonymous calls.
create or replace function public.can_access_site(target_site uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(is_platform_owner() or site_role_for(target_site) is not null, false)
$$;

create or replace function public.can_manage_site(target_site uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(is_platform_owner() or site_role_for(target_site) = 'site_admin', false)
$$;

grant execute on function public.can_access_site(uuid) to authenticated, service_role;
grant execute on function public.can_manage_site(uuid) to authenticated, service_role;
