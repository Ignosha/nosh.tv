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
