-- Migration to fix Supabase Security Advisor warnings:
-- 1. Fix Function Search Path Mutable for public.set_updated_at
alter function public.set_updated_at() set search_path = public;

-- 2. Fix Public Can Execute SECURITY DEFINER Function for public.handle_new_user()
revoke execute on function public.handle_new_user() from public, authenticated;

-- 3. Secure execution privileges for RLS helper functions (grant only to authenticated and service_role)
revoke execute on function public.can_access_site(uuid) from public;
grant execute on function public.can_access_site(uuid) to authenticated, service_role;

revoke execute on function public.can_manage_site(uuid) from public;
grant execute on function public.can_manage_site(uuid) to authenticated, service_role;

revoke execute on function public.is_platform_owner() from public;
grant execute on function public.is_platform_owner() to authenticated, service_role;

revoke execute on function public.site_role_for(uuid) from public;
grant execute on function public.site_role_for(uuid) to authenticated, service_role;
