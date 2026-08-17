-- Prevent privilege escalation through direct profile updates.
-- RLS restricts rows, while column grants restrict which fields a user may alter.
revoke update on table public.profiles from authenticated;
grant update (full_name) on table public.profiles to authenticated;

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Security-definer permission helpers must never be callable by anonymous users.
revoke execute on function public.is_platform_owner() from public, anon;
revoke execute on function public.site_role_for(uuid) from public, anon;
revoke execute on function public.can_access_site(uuid) from public, anon;
revoke execute on function public.can_manage_site(uuid) from public, anon;
