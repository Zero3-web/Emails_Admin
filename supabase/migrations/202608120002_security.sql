create or replace function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger sites_updated_at before update on sites for each row execute function set_updated_at();
create trigger integrations_updated_at before update on site_integrations for each row execute function set_updated_at();
create trigger properties_updated_at before update on properties for each row execute function set_updated_at();
create trigger posts_updated_at before update on blog_posts for each row execute function set_updated_at();
create trigger automations_updated_at before update on automation_settings for each row execute function set_updated_at();
create trigger campaigns_updated_at before update on campaigns for each row execute function set_updated_at();

alter table sites enable row level security;
alter table site_integrations enable row level security;
alter table properties enable row level security;
alter table blog_posts enable row level security;
alter table automation_settings enable row level security;
alter table campaigns enable row level security;
alter table campaign_items enable row level security;
alter table sync_logs enable row level security;

create policy admin_sites on sites for all to authenticated using (true) with check (true);
create policy admin_integrations on site_integrations for all to authenticated using (true) with check (true);
create policy admin_properties on properties for all to authenticated using (true) with check (true);
create policy admin_posts on blog_posts for all to authenticated using (true) with check (true);
create policy admin_automations on automation_settings for all to authenticated using (true) with check (true);
create policy admin_campaigns on campaigns for all to authenticated using (true) with check (true);
create policy admin_campaign_items on campaign_items for all to authenticated using (true) with check (true);
create policy admin_sync_logs on sync_logs for all to authenticated using (true) with check (true);

alter table sites add constraint sites_primary_color_hex check (primary_color ~ '^#[0-9A-Fa-f]{6}$');
alter table sites add constraint sites_secondary_color_hex check (secondary_color ~ '^#[0-9A-Fa-f]{6}$');
alter table automation_settings add constraint automation_frequency_valid check (frequency in ('weekly','monthly'));
alter table automation_settings add constraint automation_day_valid check ((frequency='weekly' and day_of_week between 1 and 7) or (frequency='monthly' and day_of_month between 1 and 28));
