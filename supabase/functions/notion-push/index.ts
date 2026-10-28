// Supabase Edge Function: pushes one journal entry to its Notion database.
// Secret needed (Edge Functions → Secrets): NOTION_TOKEN
// The caller must be signed in; the entry is read with the caller's own session (Row Level Security applies).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Notion databases under "Daily Journal" (database IDs, not secrets)
const DBS: Record<string, string> = {
  thought: "e322fc66-4ba1-47c3-91ab-46a93b74a2bf",
  note: "ccf56525-5dd9-472a-99cd-eb1262ff083d",
  meeting: "ed6d9e4f-1111-460e-8af0-191321fad09d",
  scripture: "c8ac314c-db63-43d7-9467-298b2e289f5e",
  office: "d637a6bd-4d9a-4fe3-a130-e82b82a85939",
  examen: "69c63a5f-75fe-4bb7-848d-5cecc4f2650c",
};
// People database (one row per person, matched by Name; synced from the People page)
const PEOPLE_DB = "22471c50-f1da-4d04-827e-608f751aaaca";
const TZ = "America/Chicago";
const NOTION = "https://api.notion.com/v1";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: unknown) => new Response(JSON.stringify(o), { headers: { ...cors, "Content-Type": "application/json" } });
const nh = () => ({
  Authorization: `Bearer ${Deno.env.get("NOTION_TOKEN")}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

// ---- Notion value helpers ----
const chunks = (t: string, n = 2000) => { const a: string[] = []; for (let i = 0; i < t.length; i += n) a.push(t.slice(i, i + n)); return a.slice(0, 100); };
const rt = (t = "") => chunks(String(t)).map((c) => ({ type: "text", text: { content: c } }));
const paras = (t = "") => String(t).split(/\n+/).filter((s) => s.trim()).map((s) => ({ object: "block", type: "paragraph", paragraph: { rich_text: rt(s) } }));
const head = (t: string) => ({ object: "block", type: "heading_3", heading_3: { rich_text: rt(t) } });
const todo = (t: string, done: boolean) => ({ object: "block", type: "to_do", to_do: { rich_text: rt(t), checked: !!done } });
const clean = (s: string) => String(s).trim().replace(/,/g, " ");
const sel = (n?: string) => ({ select: n ? { name: clean(n) } : null });
const multi = (s: unknown) => ({
  multi_select: (Array.isArray(s) ? s : String(s || "").split(",")).map((x) => clean(String(x))).filter(Boolean).map((name) => ({ name })),
});
const title = (t = "Untitled") => ({ title: rt(t || "Untitled") });
const text = (t = "") => ({ rich_text: rt(t) });
const when = (iso: string) => ({ date: { start: iso } });
const addMin = (date: string, time: string, mins: number) => {
  const [y, m, d] = date.split("-").map(Number), [h, mi] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, mi + mins)).toISOString().slice(0, 19);
};

function build(r: any) {
  const b = r.body || {};
  const base = { "Journal ID": text(r.id) };
  switch (r.type) {
    case "thought":
      return { props: { Title: title(r.title), Date: when(r.created_at), Category: sel(b.category), Mood: sel(b.mood), Tags: multi(b.tags), Folder: sel(b.folder), Link: { url: /^https?:\/\//i.test(b.link || "") ? b.link : null }, Comments: text(b.text), ...base }, kids: paras(b.text) };
    case "note":
      return { props: { Title: title(r.title), Date: when(r.created_at), Folder: sel(b.folder), Link: { url: /^https?:\/\//i.test(b.link || "") ? b.link : null }, Comments: text(b.text), ...base }, kids: paras(b.text) };
    case "meeting": {
      const acts = (b.actions || []) as { t: string; done: boolean }[];
      const start = b.date && b.time ? `${b.date}T${b.time}:00` : null;
      const date = start
        ? { date: { start, end: b.dur ? addMin(b.date, b.time, +b.dur) : undefined, time_zone: TZ } }
        : { date: { start: b.date || r.created_at } };
      return {
        props: { Title: title(r.title), When: date, "Duration (min)": { number: b.dur ? +b.dur : null }, Type: sel(b.type), People: multi(b.people || []), "Follow up by": { date: b.followUp ? { start: b.followUp } : null }, "Open action items": { number: acts.filter((a) => !a.done).length }, "Action items": text(acts.map((a) => `${a.done ? "☑" : "☐"} ${a.t}`).join("\n")), Comments: text(b.text), ...base },
        kids: [...paras(b.text), ...(acts.length ? [head("Action items"), ...acts.map((a) => todo(a.t, a.done))] : [])],
      };
    }
    case "scripture": {
      const lines = String(b.text || "").split("\n");
      const passages = lines.filter((l) => l.startsWith("📖")).map((l) => l.replace(/^📖\s*/, "")).join("; ");
      return { props: { Title: title(r.title), Date: when(r.created_at), Passages: text(passages), Tags: multi(b.tags), Comments: text(lines.filter((l) => !l.startsWith("📖")).join("\n").trim()), ...base }, kids: paras(b.text) };
    }
    case "office":
      return {
        props: { Title: title(r.title), Date: when(r.created_at), Day: { number: b.day ?? null }, Psalm: text(b.psalmRef), Proverb: text(b.proverbRef), "New Testament": text(b.ntRef), Intention: text(b.intention), "Praying for": text(b.praying), ...base },
        kids: [
          ...(b.psalm ? [head(`${b.psalmRef || "Psalm"}`), ...paras(b.psalm)] : []),
          ...(b.proverb ? [head(`${b.proverbRef || "Proverb"}`), ...paras(b.proverb)] : []),
          ...(b.nt ? [head(`${b.ntRef || "New Testament"}`), ...paras(b.nt)] : []),
          ...(b.praying ? [head("Praying for"), ...paras(b.praying)] : []),
          ...(b.intention ? [head("Intention"), ...paras(b.intention)] : []),
        ],
      };
    case "examen":
      return {
        props: { Title: title(r.title), Date: when(r.created_at), Emotions: multi(b.emotions), Tomorrow: text(b.tomorrow), Gratitude: text(b.gratitude), "Emotions note": text(b.emotionsNote), Prayer: text(b.prayer), ...base },
        kids: [
          ...(b.gratitude ? [head("Gratitude"), ...paras(b.gratitude)] : []),
          ...(b.emotionsNote ? [head("Emotions"), ...paras(b.emotionsNote)] : []),
          ...(b.prayer ? [head("Prayer"), ...paras(b.prayer)] : []),
          ...(b.tomorrow ? [head("Tomorrow"), ...paras(b.tomorrow)] : []),
        ],
      };
  }
  return { props: { Title: title(r.title), ...base }, kids: [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!Deno.env.get("NOTION_TOKEN")) return json({ ok: false, error: "NOTION_TOKEN secret is not set" });
    const body = await req.json();
    const { id, action } = body;

    if (action === "status") {
      const me = await fetch(`${NOTION}/users/me`, { headers: nh() });
      if (!me.ok) return json({ ok: false, error: "Notion rejected the token" });
      const db = await fetch(`${NOTION}/databases/${DBS.thought}`, { headers: nh() });
      return json(db.ok ? { ok: true } : { ok: false, error: "The integration can't see the Daily Journal page. In Notion: open it → ••• → Connections → add your integration." });
    }

    if (action === "people-list") {
      // read every person from the People database so the app can fill in details you added in Notion
      const plain = (x: any) => ((x?.rich_text || x?.title || []) as any[]).map((t) => t.plain_text).join("");
      const out: unknown[] = [];
      let cursor: string | undefined;
      do {
        const q = await fetch(`${NOTION}/databases/${PEOPLE_DB}/query`, {
          method: "POST", headers: nh(),
          body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
        });
        const j = await q.json();
        if (!q.ok) return json({ ok: false, error: j.message || "Notion query failed" });
        for (const r of j.results || []) {
          const pr = r.properties || {};
          out.push({
            name: plain(pr.Name), company: plain(pr.Company), role: plain(pr.Role),
            phone: pr.Phone?.phone_number || "", email: pr.Email?.email || "",
            met: plain(pr["How we met"]), birthday: plain(pr.Birthday), notes: plain(pr.Notes),
          });
        }
        cursor = j.has_more ? j.next_cursor : undefined;
      } while (cursor);
      return json({ ok: true, people: out });
    }

    if (action === "people") {
      // upsert people by Name; "remove" archives rows. Capped per call so it stays well inside the time limit.
      const list = (Array.isArray(body.people) ? body.people : []).slice(0, 25);
      const remove = (Array.isArray(body.remove) ? body.remove : []).slice(0, 25);
      const find = async (name: string) => {
        const q = await fetch(`${NOTION}/databases/${PEOPLE_DB}/query`, {
          method: "POST", headers: nh(),
          body: JSON.stringify({ filter: { property: "Name", title: { equals: name } }, page_size: 1 }),
        });
        const j = await q.json();
        if (!q.ok) throw new Error(j.message || "Notion query failed");
        return j.results?.[0];
      };
      let saved = 0, removed = 0;
      for (const p of list) {
        const name = String(p?.name || "").trim().slice(0, 200);
        if (!name) continue;
        const email = String(p.email || "").trim();
        const props = {
          Name: title(name), Company: text(p.company), Role: text(p.role),
          Phone: { phone_number: p.phone ? String(p.phone).slice(0, 100) : null },
          Email: { email: /^\S+@\S+$/.test(email) ? email : null },
          "How we met": text(p.met), Birthday: text(p.birthday), Notes: text(p.notes),
          Meetings: { number: Number.isFinite(+p.meetings) ? +p.meetings : null },
          "Last met": { date: /^\d{4}-\d{2}-\d{2}$/.test(String(p.lastMet || "")) ? { start: p.lastMet } : null },
        };
        const existing = await find(name);
        // On update, never blank a field in Notion just because the app has nothing for it
        // (details can be filled in or edited directly in Notion).
        const upd: Record<string, unknown> = { ...props };
        const blank: Record<string, boolean> = {
          Company: !String(p.company || "").trim(), Role: !String(p.role || "").trim(),
          "How we met": !String(p.met || "").trim(), Birthday: !String(p.birthday || "").trim(),
          Notes: !String(p.notes || "").trim(), Phone: !String(p.phone || "").trim(),
          Email: !/^\S+@\S+$/.test(email),
        };
        for (const k of Object.keys(blank)) if (blank[k]) delete upd[k];
        const res = existing
          ? await fetch(`${NOTION}/pages/${existing.id}`, { method: "PATCH", headers: nh(), body: JSON.stringify({ properties: upd }) })
          : await fetch(`${NOTION}/pages`, { method: "POST", headers: nh(), body: JSON.stringify({ parent: { database_id: PEOPLE_DB }, properties: props }) });
        const out = await res.json();
        if (!res.ok) return json({ ok: false, error: out.message || "Notion error" });
        saved++;
      }
      for (const n of remove) {
        const existing = await find(String(n || "").trim());
        if (existing) {
          await fetch(`${NOTION}/pages/${existing.id}`, { method: "PATCH", headers: nh(), body: JSON.stringify({ archived: true }) });
          removed++;
        }
      }
      return json({ ok: true, saved, removed });
    }

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: row, error } = await supa.from("entries").select("*").eq("id", id).single();
    if (error || !row) return json({ ok: false, error: "Entry not found" });
    const dbId = DBS[row.type];
    if (!dbId) return json({ ok: false, error: `No Notion database for type ${row.type}` });

    // re-sending replaces the earlier Notion page instead of duplicating it
    if (row.body?.notionPageId && row.body.notionPageId !== "sent") {
      await fetch(`${NOTION}/pages/${row.body.notionPageId}`, { method: "PATCH", headers: nh(), body: JSON.stringify({ archived: true }) });
    }
    const { props, kids } = build(row);
    const res = await fetch(`${NOTION}/pages`, {
      method: "POST", headers: nh(),
      body: JSON.stringify({ parent: { database_id: dbId }, properties: props, children: kids.slice(0, 100) }),
    });
    const out = await res.json();
    if (!res.ok) return json({ ok: false, error: out.message || "Notion error" });
    await supa.from("entries").update({ sent_to_notion: true, body: { ...row.body, notionPageId: out.id } }).eq("id", id);
    return json({ ok: true, url: out.url });
  } catch (e) {
    return json({ ok: false, error: String(e) });
  }
});
