create table if not exists public.projects (
  id text primary key,
  slug text not null unique,
  university_id text not null,
  draft_content jsonb,
  published_content jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists projects_university_idx
  on public.projects (university_id);

create index if not exists projects_published_idx
  on public.projects (published_at desc);

insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', true)
on conflict (id) do update set public = excluded.public;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Project assets are public'
  ) then
    create policy "Project assets are public"
      on storage.objects
      for select
      using (bucket_id = 'project-assets');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Project assets can be inserted'
  ) then
    create policy "Project assets can be inserted"
      on storage.objects
      for insert
      with check (bucket_id = 'project-assets');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Project assets can be updated'
  ) then
    create policy "Project assets can be updated"
      on storage.objects
      for update
      using (bucket_id = 'project-assets')
      with check (bucket_id = 'project-assets');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Project assets can be deleted'
  ) then
    create policy "Project assets can be deleted"
      on storage.objects
      for delete
      using (bucket_id = 'project-assets');
  end if;
end
$$;
