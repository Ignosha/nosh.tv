-- Kinledger database. Run this whole file in the Supabase SQL editor.
-- It is safe to run again: every statement only adds what is missing.

create table if not exists kl_cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  role text not null,
  name text not null,
  email text not null,
  phone text,
  region text,
  date_of_death date,
  known_holdings text,
  devices text,
  has_authority text,
  message text,
  package text,
  status text not null default 'new'
);

alter table kl_cases add column if not exists package text;
-- Private link for the family's case portal (/case/<token>).
alter table kl_cases add column if not exists token uuid not null default gen_random_uuid();
create unique index if not exists kl_cases_token on kl_cases (token);
-- Payments (filled in by the Stripe webhook).
alter table kl_cases add column if not exists paid_at timestamptz;
alter table kl_cases add column if not exists amount_paid integer;
alter table kl_cases add column if not exists stripe_session text;
-- What the family sent from their portal scan, and what the pipeline built from it.
alter table kl_cases add column if not exists findings jsonb;
alter table kl_cases add column if not exists report jsonb;
alter table kl_cases add column if not exists report_approved boolean not null default false;
alter table kl_cases add column if not exists drafts jsonb;
-- Estate, divorce, bankruptcy or other. date_of_death holds the matter's valuation date.
alter table kl_cases add column if not exists matter_type text not null default 'estate';
-- Working notes and follow-up scheduling.
alter table kl_cases add column if not exists notes text;
alter table kl_cases add column if not exists last_contact_at timestamptz;
alter table kl_cases add column if not exists next_followup_at timestamptz;

create table if not exists kl_events (
  id bigint generated always as identity primary key,
  case_id uuid not null references kl_cases (id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null,
  body text
);
create index if not exists kl_events_case on kl_events (case_id, at desc);

-- Only the server (service role) reads or writes these tables.
alter table kl_cases enable row level security;
alter table kl_events enable row level security;

-- Add-on results (tracing map, cost-basis schedule, dissipation analysis) for a matter.
alter table kl_cases add column if not exists extras jsonb;

-- Asset-movement alerts: addresses watched daily for any change in balance or new transactions.
create table if not exists kl_watches (
  id bigint generated always as identity primary key,
  case_id uuid not null references kl_cases (id) on delete cascade,
  chain text not null,
  address text not null,
  snapshot jsonb,
  tx_count integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_checked_at timestamptz,
  last_change_at timestamptz,
  unique (case_id, chain, address)
);
create index if not exists kl_watches_active on kl_watches (active, last_checked_at);

-- Client finder and outreach: professional prospects (attorneys, fiduciaries, trustees) from public sources.
create table if not exists kl_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  source_ref text,
  name text,
  firm text,
  email text,
  phone text,
  website text,
  city text,
  state text,
  segment text not null default 'estate',
  practice text[] not null default '{}',
  evidence text,
  score integer not null default 0,
  status text not null default 'new',
  step integer not null default 0,
  next_send_at timestamptz,
  last_sent_at timestamptz,
  notes text,
  unsub_token uuid not null default gen_random_uuid()
);
create unique index if not exists kl_leads_email on kl_leads (lower(email)) where email is not null;
create unique index if not exists kl_leads_source_ref on kl_leads (source, source_ref) where source_ref is not null;
create unique index if not exists kl_leads_unsub on kl_leads (unsub_token);
create index if not exists kl_leads_due on kl_leads (status, next_send_at);

create table if not exists kl_lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references kl_leads (id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null,
  body text
);
create index if not exists kl_lead_events_lead on kl_lead_events (lead_id, at desc);

alter table kl_watches enable row level security;
alter table kl_leads enable row level security;
alter table kl_lead_events enable row level security;
