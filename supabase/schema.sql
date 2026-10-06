-- Run once in the Supabase SQL editor.
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  name text,
  email text,
  phone text,
  need text,
  status text not null default 'new' check (status in ('new', 'booked')),
  appointment_start timestamptz,
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conversation_id)
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  contents jsonb not null default '[]'::jsonb,
  page_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only the server (service role) touches these tables.
alter table leads enable row level security;
alter table conversations enable row level security;
