-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to run more than once.
-- Your settings (reminder times and days, backup reminder, Notion sync choice) so they follow you across devices.

create table if not exists public.user_settings (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  prefs      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
