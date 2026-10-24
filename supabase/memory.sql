-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to run more than once.
-- Scripture memory: your passages, how well you know them, and when to review them.
-- Only the reference is stored (never the verse text); the text is fetched when you study.

create table if not exists public.memory_passages (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ref           text not null,                       -- e.g. Romans 8:28–30
  translation   text not null default 'CSB' check (translation in ('CSB','NIV','NLT')),
  status        text not null default 'learning' check (status in ('learning','memorized')),
  interval_days int  not null default 30 check (interval_days between 1 and 730),
  memorized_at  timestamptz,
  last_reviewed timestamptz,
  next_review   date,
  progress      jsonb not null default '{}'::jsonb,  -- best level reached per study mode
  created_at    timestamptz not null default now()
);

alter table public.memory_passages enable row level security;
drop policy if exists "own memory" on public.memory_passages;
create policy "own memory" on public.memory_passages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
