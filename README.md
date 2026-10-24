# Daily Journal

A private, phone-first journal: thoughts, notes, meetings, scripture notes, a morning Office with a daily reading plan, and an evening Examen. Entries can be pushed to Notion.

**Status:** sign-in and saving are live on Supabase. Every form saves to your private `entries` table, and your lists, People, follow-ups, reading plan and week view are built from what you've saved. Not built yet: Notion push, live ESV lookup (only a few sample verses work), and voice transcription.

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
