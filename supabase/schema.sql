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

-- Firm Premier: bearer links are confidential credentials, matching case portals.
create table if not exists kl_firms (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  name text not null,
  email text not null,
  case_lead text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table kl_firms enable row level security;
alter table kl_cases add column if not exists firm_id uuid references kl_firms(id);
alter table kl_cases add column if not exists case_lead text;
alter table kl_cases add column if not exists due_at timestamptz;
create index if not exists kl_cases_firm on kl_cases(firm_id, created_at);
create table if not exists kl_screenings (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references kl_firms(id),
  month date not null,
  status text not null default 'pending' check (status in ('pending','complete')),
  completed_at timestamptz,
  unique(firm_id, month)
);
alter table kl_screenings enable row level security;
create table if not exists kl_screening_matters (
  screening_id uuid not null references kl_screenings(id),
  case_id uuid not null references kl_cases(id),
  outcome text,
  primary key(screening_id,case_id)
);
alter table kl_screening_matters enable row level security;

-- Profitable scope and automation. Functions are service-role only.
alter table kl_cases add column if not exists service_kind text not null default 'investigation';
alter table kl_cases add column if not exists findings_version integer not null default 0;
alter table kl_cases add column if not exists report_version integer;
create table if not exists kl_time_entries (
  id bigint generated always as identity primary key,
  case_id uuid not null references kl_cases(id),
  minutes integer not null check(minutes > 0 and minutes <= 1440),
  note text not null,
  created_at timestamptz not null default now()
);
alter table kl_time_entries enable row level security;
create table if not exists kl_jobs (
  id bigint generated always as identity primary key,
  case_id uuid not null references kl_cases(id),
  version integer not null,
  state text not null default 'pending' check(state in ('pending','running','review','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  error text,
  unique(case_id,version)
);
alter table kl_jobs enable row level security;
create or replace function kl_enqueue_findings() returns trigger language plpgsql set search_path = public as $$
begin
  if new.findings is distinct from old.findings then
    new.findings_version := old.findings_version + 1;
    new.report_approved := false;
  end if;
  if new.findings is not null and (new.paid_at is not null or new.firm_id is not null) and (new.findings is distinct from old.findings or new.paid_at is distinct from old.paid_at) then
    insert into kl_jobs(case_id,version) values(new.id,new.findings_version) on conflict(case_id,version) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists kl_findings_queue on kl_cases;
create trigger kl_findings_queue before update of findings,paid_at on kl_cases for each row execute function kl_enqueue_findings();
create or replace function kl_claim_job() returns setof kl_jobs language sql security definer set search_path = public as $$
  update kl_jobs set state='running', attempts=attempts+1, locked_at=now()
  where id=(select id from kl_jobs where attempts<3 and
    ((state='pending' and available_at<=now()) or (state='running' and locked_at<now()-interval '10 minutes'))
    order by available_at for update skip locked limit 1) returning *;
$$;
create or replace function kl_open_firm_matter(p_token uuid,p_name text,p_type text,p_kind text,p_due timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare f kl_firms; n integer; used_minutes integer; result uuid;
begin
  select * into f from kl_firms where token=p_token and active=true for update;
  if f.id is null then raise exception 'Firm unavailable'; end if;
  if length(trim(p_name))=0 or length(p_name)>200 or p_type not in ('estate','divorce','bankruptcy','other') or p_kind not in ('investigation','screening') then raise exception 'Invalid matter'; end if;
  select count(*) into n from kl_cases where firm_id=f.id and service_kind=p_kind and created_at>=date_trunc('month',now());
  if (p_kind='investigation' and n>=4) or (p_kind='screening' and n>=50) then raise exception 'Monthly capacity reached. Contact your case lead for a separate quote.'; end if;
  select coalesce(sum(t.minutes),0) into used_minutes from kl_time_entries t join kl_cases c on c.id=t.case_id
    where c.firm_id=f.id and t.created_at>=date_trunc('month',now());
  if p_kind='investigation' and used_minutes>=1500 then raise exception 'Included specialist hours used. Request a separate quote.'; end if;
  insert into kl_cases(name,role,email,firm_id,case_lead,due_at,package,matter_type,status,next_followup_at,service_kind)
  values(p_name,'attorney',f.email,f.id,f.case_lead,p_due,'premier',p_type,'new',now(),p_kind) returning token into result;
  return result;
end $$;
revoke all on function kl_claim_job() from public, anon, authenticated;
revoke all on function kl_open_firm_matter(uuid,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function kl_claim_job() to service_role;
grant execute on function kl_open_firm_matter(uuid,text,text,text,timestamptz) to service_role;
-- Outreach state controls: durable per-step claim prevents concurrent duplicate sends.
alter table kl_leads add column if not exists send_claimed_at timestamptz;
alter table kl_leads add column if not exists delivery_id text;
alter table kl_leads add column if not exists delivery_error text;

create or replace function kl_save_preparation(p_case uuid,p_version integer,p_report jsonb,p_drafts jsonb,p_tokens jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
declare changed integer;
begin
  update kl_cases set report=p_report,drafts=p_drafts,report_version=p_version,
    extras=coalesce(extras,'{}'::jsonb)||jsonb_build_object('tokenEvidence',p_tokens),
    next_followup_at=now()
    where id=p_case and findings_version=p_version and report_approved=false;
  get diagnostics changed=row_count;
  return changed>0;
end $$;
revoke all on function kl_save_preparation(uuid,integer,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function kl_save_preparation(uuid,integer,jsonb,jsonb,jsonb) to service_role;

-- Issued Report Studio records are preserved separately from editable case drafts.
create table if not exists kl_report_versions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references kl_cases(id),
  version integer not null check(version>0),
  issued_at timestamptz not null,
  archived_at timestamptz not null default now(),
  author text not null,
  reviewer text not null,
  sealed jsonb not null,
  fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
  unique(case_id,version), unique(case_id,fingerprint)
);
alter table kl_report_versions enable row level security;
create or replace function kl_preserve_issued_report() returns trigger language plpgsql as $$
begin raise exception 'Issued report archives are append-only'; end $$;
drop trigger if exists kl_report_versions_immutable on kl_report_versions;
create trigger kl_report_versions_immutable before update or delete on kl_report_versions for each row execute function kl_preserve_issued_report();
create or replace function kl_archive_report(p_case uuid,p_sealed jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare next_version integer; found_version integer;
begin
  perform id from kl_cases where id=p_case for update;
  if not found then raise exception 'Matter unavailable'; end if;
  if p_sealed->'record'->>'format' is distinct from 'TraceSworn Report Studio v1' or
     length(coalesce(p_sealed->'record'->'document'->>'author',''))=0 or
     length(coalesce(p_sealed->'record'->'document'->>'reviewer',''))=0 or
     lower(p_sealed->'record'->'document'->>'reviewer')=lower(p_sealed->'record'->'document'->>'author') then raise exception 'Invalid reviewed report'; end if;
  select version into found_version from kl_report_versions where case_id=p_case and fingerprint=p_sealed->'fingerprint'->>'value';
  if found_version is not null then return found_version; end if;
  select coalesce(max(version),0)+1 into next_version from kl_report_versions where case_id=p_case;
  insert into kl_report_versions(case_id,version,issued_at,author,reviewer,sealed,fingerprint)
  values(p_case,next_version,(p_sealed->'record'->>'issuedAt')::timestamptz,p_sealed->'record'->'document'->>'author',p_sealed->'record'->'document'->>'reviewer',p_sealed,p_sealed->'fingerprint'->>'value');
  insert into kl_events(case_id,kind,body) values(p_case,'report-archive','Archived issued report version '||next_version||'. Declared reviewer: '||(p_sealed->'record'->'document'->>'reviewer'));
  return next_version;
end $$;
revoke all on function kl_archive_report(uuid,jsonb) from public,anon,authenticated;
grant execute on function kl_archive_report(uuid,jsonb) to service_role;
-- Archives may be read by the server and appended only through the validated RPC path.
revoke insert,update,delete,truncate on kl_report_versions from anon,authenticated,service_role;
grant select on kl_report_versions to service_role;
