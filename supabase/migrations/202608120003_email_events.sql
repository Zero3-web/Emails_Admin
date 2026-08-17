create table outbound_emails (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns on delete set null,
  site_id uuid references sites on delete set null,
  resend_email_id text not null unique,
  recipient text not null,
  sender text not null,
  subject text not null,
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  last_event_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table email_events (
  id uuid primary key default gen_random_uuid(),
  resend_event_id text not null unique,
  resend_email_id text,
  event_type text not null,
  occurred_at timestamptz not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_outbound_emails_status_sent_at on outbound_emails(status, sent_at desc);
create index idx_outbound_emails_recipient on outbound_emails(recipient);
create index idx_email_events_email_occurred on email_events(resend_email_id, occurred_at desc);

alter table outbound_emails enable row level security;
alter table email_events enable row level security;
create policy admin_outbound_emails on outbound_emails for all to authenticated using (true) with check (true);
create policy admin_email_events on email_events for all to authenticated using (true) with check (true);
