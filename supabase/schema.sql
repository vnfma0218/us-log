-- Couples + memories schema for US-LOG MVP
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8),
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'partner')),
  created_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  memory_date date not null,
  title text not null,
  summary text not null,
  location_name text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  unique (couple_id, memory_date)
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  taken_at timestamptz not null,
  location_name text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create index if not exists memories_couple_date_idx on public.memories (couple_id, memory_date desc);
create index if not exists photos_couple_taken_idx on public.photos (couple_id, taken_at desc);

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.memories enable row level security;
alter table public.photos enable row level security;

drop policy if exists "members can read couples" on public.couples;
create policy "members can read couples"
on public.couples for select
using (
  exists (
    select 1 from public.couple_members cm
    where cm.couple_id = couples.id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can read members" on public.couple_members;
create policy "members can read members"
on public.couple_members for select
using (user_id = auth.uid());

drop policy if exists "members can manage own membership row" on public.couple_members;
create policy "members can manage own membership row"
on public.couple_members for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "members can manage memories" on public.memories;
create policy "members can manage memories"
on public.memories for all
using (
  exists (
    select 1 from public.couple_members cm
    where cm.couple_id = memories.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.couple_members cm
    where cm.couple_id = memories.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can manage photos" on public.photos;
create policy "members can manage photos"
on public.photos for all
using (
  exists (
    select 1 from public.couple_members cm
    where cm.couple_id = photos.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.couple_members cm
    where cm.couple_id = photos.couple_id
      and cm.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

drop policy if exists "members can read photo objects" on storage.objects;
create policy "members can read photo objects"
on storage.objects for select
using (
  bucket_id = 'photos'
  and exists (
    select 1 from public.couple_members cm
    where cm.couple_id::text = split_part(name, '/', 1)
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can upload photo objects" on storage.objects;
create policy "members can upload photo objects"
on storage.objects for insert
with check (
  bucket_id = 'photos'
  and exists (
    select 1 from public.couple_members cm
    where cm.couple_id::text = split_part(name, '/', 1)
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can update photo objects" on storage.objects;
create policy "members can update photo objects"
on storage.objects for update
using (
  bucket_id = 'photos'
  and exists (
    select 1 from public.couple_members cm
    where cm.couple_id::text = split_part(name, '/', 1)
      and cm.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'photos'
  and exists (
    select 1 from public.couple_members cm
    where cm.couple_id::text = split_part(name, '/', 1)
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can delete photo objects" on storage.objects;
create policy "members can delete photo objects"
on storage.objects for delete
using (
  bucket_id = 'photos'
  and exists (
    select 1 from public.couple_members cm
    where cm.couple_id::text = split_part(name, '/', 1)
      and cm.user_id = auth.uid()
  )
);
