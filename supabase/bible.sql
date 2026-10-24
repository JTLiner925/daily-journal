-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to run more than once.
-- Highlights and cross-references for the Bible reader. Each row belongs to the signed-in user.
-- Verse references are stored as IDs like JHN.3.16 (same for every translation).

create table if not exists public.verse_marks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ref        text not null,
  color      text not null check (color in ('yellow','green','blue','pink','orange')),
  created_at timestamptz not null default now(),
  unique (user_id, ref)
);

create table if not exists public.verse_links (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  a          text not null,   -- e.g. JHN.3.16 or JHN.3.16-JHN.3.18
  b          text not null,   -- e.g. ROM.5.8
  note       text,
  created_at timestamptz not null default now()
);

alter table public.verse_marks enable row level security;
alter table public.verse_links enable row level security;

drop policy if exists "own marks" on public.verse_marks;
drop policy if exists "own links" on public.verse_links;
create policy "own marks" on public.verse_marks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own links" on public.verse_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
