-- Index the tenant-scoped sort/filter patterns used by the server repositories.
create index if not exists properties_site_published_idx
  on public.properties(site_id, published_at desc);
create index if not exists blog_posts_site_published_idx
  on public.blog_posts(site_id, published_at desc);
create index if not exists automation_settings_site_created_idx
  on public.automation_settings(site_id, created_at);
create index if not exists campaigns_site_created_idx
  on public.campaigns(site_id, created_at desc);
create index if not exists sync_logs_site_created_idx
  on public.sync_logs(site_id, created_at desc);
create index if not exists outbound_emails_site_sent_idx
  on public.outbound_emails(site_id, sent_at desc);

-- Keep malformed schedules out even if a privileged client bypasses the UI.
alter table public.automation_settings
  drop constraint if exists automation_settings_frequency_check;
alter table public.automation_settings
  add constraint automation_settings_frequency_check
  check (frequency in ('weekly', 'monthly')) not valid;

alter table public.automation_settings
  drop constraint if exists automation_settings_day_check;
alter table public.automation_settings
  add constraint automation_settings_day_check
  check (
    (frequency = 'weekly' and day_of_week between 1 and 7 and day_of_month is null)
    or
    (frequency = 'monthly' and day_of_month between 1 and 28 and day_of_week is null)
  ) not valid;
