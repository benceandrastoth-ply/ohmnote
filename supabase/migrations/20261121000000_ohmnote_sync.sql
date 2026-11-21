-- OhmNote accounts and sync.
-- Every row and every stored file belongs to one user; row level security makes sure nobody else can
-- read or change it. Projects, settings and font descriptions live in tables; pictures (scanned pages)
-- and font files live in the private "ohmnote" storage bucket under <user id>/...

create table if not exists public.projects (
  user_id  uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  id       text    not null,
  name     text    not null default '',
  data     jsonb,
  updated  bigint  not null default 0,
  deleted  boolean not null default false,
  primary key (user_id, id)
);

create table if not exists public.user_settings (
  user_id  uuid   primary key default auth.uid() references auth.users (id) on delete cascade,
  prefs    jsonb,
  updated  bigint not null default 0
);

create table if not exists public.fonts (
  user_id  uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  id       text    not null,
  meta     jsonb,
  updated  bigint  not null default 0,
  deleted  boolean not null default false,
  primary key (user_id, id)
);

alter table public.projects      enable row level security;
alter table public.user_settings enable row level security;
alter table public.fonts         enable row level security;

create policy "own projects" on public.projects
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own settings" on public.user_settings
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own fonts" on public.fonts
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- private bucket for pictures and font files, 30 MB per file
insert into storage.buckets (id, name, public, file_size_limit)
values ('ohmnote', 'ohmnote', false, 31457280)
on conflict (id) do nothing;

create policy "own files: read" on storage.objects
  for select to authenticated using (bucket_id = 'ohmnote' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files: add" on storage.objects
  for insert to authenticated with check (bucket_id = 'ohmnote' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files: change" on storage.objects
  for update to authenticated using (bucket_id = 'ohmnote' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files: remove" on storage.objects
  for delete to authenticated using (bucket_id = 'ohmnote' and (storage.foldername(name))[1] = (select auth.uid())::text);
