create table if not exists public.members (
  id text primary key,
  name text not null,
  title text not null default '',
  university text not null,
  university_id text,
  country text not null,
  city text not null,
  bio text not null default '',
  image text,
  profile_url text,
  website_url text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists members_university_idx
  on public.members (university_id);

create index if not exists members_created_at_idx
  on public.members (created_at asc);
