-- Run in Supabase: SQL Editor → New query → paste → Run.
-- Safe to run more than once.
-- Private storage bucket for voice recordings. Each user can only touch files in their own folder.

insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

drop policy if exists "audio: read own" on storage.objects;
drop policy if exists "audio: add own" on storage.objects;
drop policy if exists "audio: delete own" on storage.objects;

create policy "audio: read own"   on storage.objects for select to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio: add own"    on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
