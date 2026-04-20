create table if not exists public.projects (
  id text primary key,
  slug text not null unique,
  university_id text not null,
  world_id text,
  draft_content jsonb,
  published_content jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists world_id text;

create index if not exists projects_university_idx
  on public.projects (university_id);

create index if not exists projects_world_idx
  on public.projects (world_id);

create index if not exists projects_published_idx
  on public.projects (published_at desc);

do $$
declare
  legacy record;
  world_record_id text;
  base_slug text;
  candidate_slug text;
  suffix integer;
begin
  if to_regclass('public.worlds') is null then
    raise notice 'public.worlds is missing. Apply supabase/worlds.sql before backfilling project world_id values.';
    return;
  end if;

  for legacy in
    select
      id,
      slug,
      university_id,
      draft_content,
      published_content,
      published_at,
      updated_at,
      created_at
    from public.projects
    where coalesce(world_id, '') = ''
    order by created_at, id
  loop
    world_record_id := 'world-' || legacy.id;

    insert into public.worlds (
      id,
      slug,
      university_id,
      draft_content,
      published_content,
      published_at,
      updated_at,
      created_at
    )
    values (
      world_record_id,
      legacy.slug,
      legacy.university_id,
      case
        when legacy.draft_content is null then null
        else jsonb_build_object(
          'slug', legacy.slug,
          'universityId', legacy.university_id,
          'title', coalesce(legacy.draft_content->>'title', legacy.slug),
          'summary', coalesce(legacy.draft_content->>'summary', ''),
          'year', coalesce((legacy.draft_content->>'year')::integer, extract(year from now())::integer),
          'tags', coalesce(legacy.draft_content->'tags', '[]'::jsonb),
          'coverImageUrl', coalesce(legacy.draft_content->>'coverImageUrl', ''),
          'cardImageUrl', coalesce(nullif(legacy.draft_content->>'cardImageUrl', ''), legacy.draft_content->>'coverImageUrl', ''),
          'gallery', coalesce(legacy.draft_content->'gallery', '[]'::jsonb),
          'markerOffset', coalesce(legacy.draft_content->'markerOffset', jsonb_build_object('lat', 0, 'lng', 0)),
          'locationLabel', coalesce(legacy.draft_content->>'locationLabel', '')
        )
      end,
      case
        when legacy.published_content is null then null
        else jsonb_build_object(
          'slug', legacy.slug,
          'universityId', legacy.university_id,
          'title', coalesce(legacy.published_content->>'title', legacy.slug),
          'summary', coalesce(legacy.published_content->>'summary', ''),
          'year', coalesce((legacy.published_content->>'year')::integer, extract(year from now())::integer),
          'tags', coalesce(legacy.published_content->'tags', '[]'::jsonb),
          'coverImageUrl', coalesce(legacy.published_content->>'coverImageUrl', ''),
          'cardImageUrl', coalesce(nullif(legacy.published_content->>'cardImageUrl', ''), legacy.published_content->>'coverImageUrl', ''),
          'gallery', coalesce(legacy.published_content->'gallery', '[]'::jsonb),
          'markerOffset', coalesce(legacy.published_content->'markerOffset', jsonb_build_object('lat', 0, 'lng', 0)),
          'locationLabel', coalesce(legacy.published_content->>'locationLabel', '')
        )
      end,
      legacy.published_at,
      legacy.updated_at,
      legacy.created_at
    )
    on conflict (id) do update
    set
      slug = excluded.slug,
      university_id = excluded.university_id,
      draft_content = excluded.draft_content,
      published_content = excluded.published_content,
      published_at = excluded.published_at,
      updated_at = excluded.updated_at;

    base_slug := legacy.slug || '-project';
    candidate_slug := base_slug;
    suffix := 2;

    while exists (
      select 1
      from public.projects p
      where p.slug = candidate_slug
        and p.id <> legacy.id
    ) loop
      candidate_slug := base_slug || '-' || suffix;
      suffix := suffix + 1;
    end loop;

    update public.projects
    set
      slug = candidate_slug,
      world_id = world_record_id,
      draft_content = case
        when legacy.draft_content is null then null
        else jsonb_set(
          jsonb_set(legacy.draft_content, '{slug}', to_jsonb(candidate_slug), true),
          '{worldId}',
          to_jsonb(world_record_id),
          true
        )
      end,
      published_content = case
        when legacy.published_content is null then null
        else jsonb_set(
          jsonb_set(legacy.published_content, '{slug}', to_jsonb(candidate_slug), true),
          '{worldId}',
          to_jsonb(world_record_id),
          true
        )
      end
    where id = legacy.id;
  end loop;
end
$$;

do $$
begin
  if to_regclass('public.worlds') is null then
    return;
  end if;

  if exists (select 1 from public.projects where coalesce(world_id, '') = '') then
    raise notice 'Skipping projects_world_id_fkey until every project row has a world_id.';
    return;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_world_id_fkey'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_world_id_fkey
      foreign key (world_id)
      references public.worlds (id)
      on delete cascade;
  end if;
end
$$;

do $$
begin
  if exists (select 1 from public.projects where coalesce(world_id, '') = '') then
    return;
  end if;

  alter table public.projects
    alter column world_id set not null;
exception
  when others then
    raise notice 'Could not enforce projects.world_id as not null: %', sqlerrm;
end
$$;

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
