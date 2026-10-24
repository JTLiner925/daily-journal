-- Run in Supabase: SQL Editor → New query → paste → Run.
-- One table for all entry types; each row belongs to the signed-in user.

create table if not exists public.entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type           text not null check (type in ('thought','note','meeting','scripture','office','examen')),
  title          text,
  summary        text,
  body           jsonb not null default '{}'::jsonb,
  sent_to_notion boolean not null default false,
  created_at     timestamptz not null default now()
);

alter table public.entries enable row level security;

create policy "own entries: read"   on public.entries for select using (auth.uid() = user_id);
create policy "own entries: add"    on public.entries for insert with check (auth.uid() = user_id);
create policy "own entries: edit"   on public.entries for update using (auth.uid() = user_id);
create policy "own entries: delete" on public.entries for delete using (auth.uid() = user_id);
