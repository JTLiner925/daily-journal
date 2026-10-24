# Daily Journal

A private, phone-first journal: thoughts, notes, meetings, scripture notes, a morning Office with a daily reading plan, and an evening Examen. Entries can be pushed to Notion.

**Status:** interface mockup with sample data. Sign-in is real once connected to Supabase (below); saving entries and the Notion push come next.

## Turn on real sign-in

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Sign In / Providers → Email:** turn **off** "Allow new users to sign up".
3. **Authentication → Users → Add user:** create your account (email + password).
4. **SQL Editor:** paste and run [`supabase/schema.sql`](supabase/schema.sql).
5. **Project Settings → API:** copy the Project URL and the `anon` public key into [`config.js`](config.js), commit and push.

The URL and anon key are public by design; the database rules only let your signed-in user read or write. Keep the `service_role` key, Notion token and ESV API key out of this repo (they will live in Supabase Edge Function secrets).

Until `config.js` is filled in, the page runs in demo mode (any password works, sample data only).
