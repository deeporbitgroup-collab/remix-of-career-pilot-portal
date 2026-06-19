-- Newsletter: public footer subscribers + a log of sent newsletters.
-- Both tables are touched only by the service-role edge functions
-- (newsletter-subscribe, send-newsletter), so RLS is enabled with no public
-- policies — the anon/auth client can never read or write them directly.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;

create table if not exists public.newsletters (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  audiences text[] not null default '{}',
  requested_count integer not null default 0,
  sent_count integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.newsletters enable row level security;
