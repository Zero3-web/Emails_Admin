-- Reliable, single-owner campaign dispatch and scheduler claims.
alter table public.campaigns
  add column if not exists sending_started_at timestamptz,
  add column if not exists dispatch_attempts integer not null default 0;

update public.campaigns
   set sending_started_at = updated_at
 where status = 'sending'
   and sending_started_at is null;

create or replace function public.claim_campaign_dispatch(p_campaign_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_count integer;
begin
  update public.campaigns
     set status = 'sending',
         sending_started_at = now(),
         dispatch_attempts = dispatch_attempts + 1,
         error_message = null
   where id = p_campaign_id
     and status = 'ready';
  get diagnostics claimed_count = row_count;
  return claimed_count = 1;
end;
$$;

create or replace function public.claim_automation_run(
  p_automation_id uuid,
  p_expected_run timestamptz,
  p_next_run timestamptz
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_count integer;
begin
  update public.automation_settings
     set last_run_at = p_expected_run,
         next_run_at = p_next_run
   where id = p_automation_id
     and is_enabled = true
     and next_run_at = p_expected_run
     and next_run_at <= now();
  get diagnostics claimed_count = row_count;
  return claimed_count = 1;
end;
$$;

revoke all on function public.claim_campaign_dispatch(uuid) from public, anon, authenticated;
revoke all on function public.claim_automation_run(uuid,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.claim_campaign_dispatch(uuid) to service_role;
grant execute on function public.claim_automation_run(uuid,timestamptz,timestamptz) to service_role;

create index if not exists campaigns_stale_sending_idx
  on public.campaigns(sending_started_at)
  where status = 'sending';
