# Daily Journal

A private, phone-first journal: thoughts, notes, meetings, scripture notes, a morning Office with a daily reading plan, and an evening Examen. Entries can be pushed to Notion.

**Status:** sign-in and saving are live on Supabase. Every form saves to your private `entries` table, and your lists, People, follow-ups, reading plan and week view are built from what you've saved. Bible lookups (CSB, NIV, NLT) go through API.Bible.

## Turn on real sign-in

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Sign In / Providers → Email:** turn **off** "Allow new users to sign up".
3. **Authentication → Users → Add user:** create your account (email + password).
4. **SQL Editor:** paste and run [`supabase/schema.sql`](supabase/schema.sql).
5. **Project Settings → API:** copy the Project URL and the `anon` public key into [`config.js`](config.js), commit and push.

The URL and anon key are public by design; the database rules only let your signed-in user read or write. Keep the `service_role` key, Notion token and ESV API key out of this repo (they will live in Supabase Edge Function secrets).

Until `config.js` is filled in, the page runs in demo mode (any password works, sample data only).

## How saving works

Entries are rows in `public.entries` (`type`, `title`, `summary`, and a `body` JSON with the form's fields). If you're offline, entries queue on the device and save automatically when you're back online.

## Notion push

Entries with "Push to Notion" ticked are sent to the **Daily Journal** page in Notion (one database per entry type) by the `notion-push` Edge Function in [`supabase/functions/notion-push`](supabase/functions/notion-push/index.ts).

1. Create a Notion internal integration (notion.so/profile/integrations) and copy its secret.
2. In Notion, open **Daily Journal** → ••• → **Connections** → add the integration.
3. Supabase → **Edge Functions → Secrets:** add `NOTION_TOKEN` with the secret.
4. Supabase → **Edge Functions → Deploy a new function → Via Editor:** name it `notion-push`, paste `index.ts`, deploy (leave "Verify JWT" on).

Settings → Notion shows "Connected" once it works. Re-sending an entry replaces its earlier Notion page.

## Voice notes

Every text box has a **Record** button. It records audio (saved privately to Supabase Storage and attached to the entry) and, where the browser supports it, transcribes as you talk using the browser's own free speech recognition. No paid service is used.

One-time setup: run [`supabase/audio.sql`](supabase/audio.sql) in the Supabase SQL Editor to create the private `audio` bucket.

Notes: recording needs the microphone permission and HTTPS (GitHub Pages is HTTPS); audio is only saved while online; Notion gets the transcript text, not the audio file.

## Bible lookups (CSB, NIV, NLT)

Scripture notes look up any reference (type `John 3:16` and press Enter) through the `scripture` Edge Function in [`supabase/functions/scripture`](supabase/functions/scripture/index.ts), using API.Bible. Pick the translation above the notes box; after a lookup you can add the next verse, open the whole chapter, or add the same passage in another translation.

1. Create an API.Bible account and an app; enable CSB, NIV and NLT; copy the API key.
2. Supabase → **Edge Functions → Secrets:** add `BIBLE_API_KEY`.
3. Supabase → **Edge Functions → Deploy a new function → Via Editor:** name it `scripture`, paste `index.ts`, deploy (leave "Verify JWT" on).
4. In the app: **Settings → Bible text → Check connection**.

Verse text is not stored by the function. The app shows each translation's copyright line and reports views to API.Bible's FUMS as their terms require. The free plan allows 5,000 calls a month; repeats within a visit are cached in the page.
