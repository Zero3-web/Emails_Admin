create unique index if not exists outbound_campaign_recipient_unique
  on public.outbound_emails(campaign_id, lower(recipient))
  where campaign_id is not null;

create index if not exists automation_settings_due_idx
  on public.automation_settings(is_enabled, next_run_at)
  where is_enabled = true;

create unique index if not exists campaigns_automation_slot_unique
  on public.campaigns((metadata->>'automation_id'), (metadata->>'scheduled_for'))
  where metadata ? 'automation_id' and metadata ? 'scheduled_for';

create table if not exists public.api_rate_limits (
  bucket text not null,
  key_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 1,
  primary key (bucket, key_hash, window_start)
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_key text,
  p_limit integer,
  p_window_seconds integer default 60
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or length(p_bucket) > 80 or length(p_key) > 128 then
    return false;
  end if;
  insert into public.api_rate_limits(bucket, key_hash, window_start, request_count)
  values (p_bucket, p_key, v_window, 1)
  on conflict (bucket, key_hash, window_start)
  do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into v_count;
  delete from public.api_rate_limits where window_start < now() - interval '1 day';
  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text,text,integer,integer) to service_role;
