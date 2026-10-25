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

## Bible reader

**Bible** in the menu opens a full reader (CSB, NIV, NLT), one chapter at a time. Tap verses to select them, then highlight, write a note, compare all three versions, link to another verse, share or copy. Tapping a verse brings up your notes and links in a panel next to the text. Search and footnotes use API.Bible.

One-time setup for highlights and links: run [`supabase/bible.sql`](supabase/bible.sql) in the Supabase SQL Editor. Notes are saved as Scripture notes (and can go to Notion). Verse text is never stored in your database, only your notes and verse references.

After changing `supabase/functions/scripture/index.ts`, paste it into the `scripture` function in Supabase and deploy again.

## Daily Office passages

Each day's psalm, proverb and New Testament chapter open in the full Bible reader inside the Office (version picker at the top): select verses, highlight, write notes, compare CSB/NIV/NLT, link verses, share or copy, and turn headings and footnotes on or off. "Open in the full Bible reader" jumps to the Bible page for search and navigation.

## Scripture memory

**Memorize** in the menu keeps your passages in two lists: Learning and a Memorized bank. Two ways to study, each with four levels (Beginner, Intermediate, Expert, Pro):

- **Missing words** with an alphabetical word bank to put the words back (Pro removes every word). A wrong word is rejected, and a Hint fills the next blank (counted as a miss).
- **First letters**, showing the first letter of each word with all the punctuation, in short lines. Some letters are missing, and you fill them in from an alphabetical letter bank (wrong ones are rejected). Higher levels remove more letters; Pro removes them all. At the end you can type the whole verse from memory and check it.

A passage is memorized automatically when you earn three gold stars (Pro, ★★★) in both study styles. It moves to the Memorized bank with a review schedule (monthly by default; weekly, every 2 weeks, or every 3 months also available; pick it on the passage card). Passages due for review show on the Today page.

One-time setup: run [`supabase/memory.sql`](supabase/memory.sql) in the Supabase SQL Editor. Only the reference is stored, never the verse text.

**Stars and levels.** Finishing a study round shows a "Great Job!" box with your time and accuracy. Each level has three stars: ★ for 70%+, ★★ for 85%+, ★★★ for 100%. Beginner is blue, Intermediate bronze, Expert silver, Pro gold. You need ★★★ at a level to unlock the next one (separately for each study style). Your best result per level shows on each passage; finishing under 70% shows a funny face, and levels you haven't finished show nothing.

Each passage card shows only your best level per study style (plus the level you're currently working on if you finished it under 70%). Tap **Records** on a card to see your best result at every level and your recent attempts.

## Settings that follow you

Reminder times and days, the backup reminder and your Notion sync choice are saved to your account (table `user_settings`), so a change on your phone shows up on your laptop. One-time setup: run [`supabase/settings.sql`](supabase/settings.sql) in the Supabase SQL Editor. Settings reload when you open the Settings page or return to the app. Day/Night is remembered per device. Phone notifications for reminders are not switched on yet.
