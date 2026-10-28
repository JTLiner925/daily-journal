-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to run more than once.
-- Your To-Do checklist. One row per to-do; each row belongs to the signed-in user.

create table if not exists public.todos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null,
  type       text not null default 'Task' check (type in ('ASAP','Task','Growth','Training','Meeting','Call','Prayer')),
  done       boolean not null default false,
  done_at    timestamptz,
  due        date,
  notes      text not null default '',
  created_at timestamptz not null default now()
);

alter table public.todos enable row level security;
drop policy if exists "own todos" on public.todos;
create policy "own todos" on public.todos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
