-- Kinledger intake requests. Run once in the Supabase SQL editor.
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
  status text not null default 'new'
);

-- Only the server (service role) reads or writes this table.
alter table kl_cases enable row level security;
