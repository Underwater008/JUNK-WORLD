create table if not exists public.worlds (
  id text primary key,
  slug text not null unique,
  university_id text not null,
  draft_content jsonb,
  published_content jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists worlds_university_idx
  on public.worlds (university_id);

create index if not exists worlds_published_idx
  on public.worlds (published_at desc);
