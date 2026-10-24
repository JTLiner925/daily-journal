// Supabase Edge Function: Bible text lookups through API.Bible (CSB, NIV, NLT).
// Secret needed (Edge Functions → Secrets): BIBLE_API_KEY
// Keep "Verify JWT" ON so only your signed-in journal can use your monthly call allowance.
// Verse text is returned to the page and is NOT stored by this function.

const BASES = ["https://rest.api.bible/v1", "https://api.scripture.api.bible/v1"];
let base = BASES[0];
const WANTED = ["CSB", "NIV", "NLT"];
// Bible IDs (public, from your API.Bible dashboard). You can override any of them with secrets BIBLE_ID_CSB, BIBLE_ID_NIV, BIBLE_ID_NLT.
const ENV_IDS: Record<string, string | undefined> = {
  CSB: Deno.env.get("BIBLE_ID_CSB") || "a556c5305ee15c3f-01",
  NIV: Deno.env.get("BIBLE_ID_NIV") || "78a9f6124f344018-01",
  NLT: Deno.env.get("BIBLE_ID_NLT") || "d6e14a625393b4da-01",
};
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: Record<string, unknown>) => new Response(JSON.stringify({ fn: "scripture", ...o }), { headers: { ...cors, "Content-Type": "application/json" } });

// id, display name, extra aliases
const BOOKS: [string, string, string[]][] = [
  ["GEN", "Genesis", ["gen", "gn"]], ["EXO", "Exodus", ["exod", "ex"]], ["LEV", "Leviticus", ["lev", "lv"]],
  ["NUM", "Numbers", ["num", "nm"]], ["DEU", "Deuteronomy", ["deut", "dt"]], ["JOS", "Joshua", ["josh"]],
  ["JDG", "Judges", ["judg", "jdg"]], ["RUT", "Ruth", ["ru"]], ["1SA", "1 Samuel", ["1 sam", "1sam"]],
  ["2SA", "2 Samuel", ["2 sam", "2sam"]], ["1KI", "1 Kings", ["1 kgs", "1kgs"]], ["2KI", "2 Kings", ["2 kgs", "2kgs"]],
  ["1CH", "1 Chronicles", ["1 chron", "1 chr"]], ["2CH", "2 Chronicles", ["2 chron", "2 chr"]], ["EZR", "Ezra", []],
  ["NEH", "Nehemiah", ["neh"]], ["EST", "Esther", ["esth"]], ["JOB", "Job", []], ["PSA", "Psalms", ["psalm", "ps", "psa", "pslm"]],
  ["PRO", "Proverbs", ["prov", "pr", "prv"]], ["ECC", "Ecclesiastes", ["eccl", "eccles", "qoheleth"]],
  ["SNG", "Song of Solomon", ["song of songs", "song", "sos", "songs"]], ["ISA", "Isaiah", ["is"]],
  ["JER", "Jeremiah", ["jer"]], ["LAM", "Lamentations", ["lam"]], ["EZK", "Ezekiel", ["ezek", "eze"]],
  ["DAN", "Daniel", ["dn"]], ["HOS", "Hosea", []], ["JOL", "Joel", []], ["AMO", "Amos", []], ["OBA", "Obadiah", ["obad"]],
  ["JON", "Jonah", []], ["MIC", "Micah", []], ["NAM", "Nahum", ["nah"]], ["HAB", "Habakkuk", []],
  ["ZEP", "Zephaniah", ["zeph"]], ["HAG", "Haggai", []], ["ZEC", "Zechariah", ["zech"]], ["MAL", "Malachi", []],
  ["MAT", "Matthew", ["matt", "mt"]], ["MRK", "Mark", ["mk"]], ["LUK", "Luke", ["lk"]], ["JHN", "John", ["jn"]],
  ["ACT", "Acts", ["acts of the apostles"]], ["ROM", "Romans", ["rom", "rm"]], ["1CO", "1 Corinthians", ["1 cor", "1cor"]],
  ["2CO", "2 Corinthians", ["2 cor", "2cor"]], ["GAL", "Galatians", ["gal"]], ["EPH", "Ephesians", ["eph"]],
  ["PHP", "Philippians", ["phil", "php"]], ["COL", "Colossians", ["col"]], ["1TH", "1 Thessalonians", ["1 thess", "1thess"]],
  ["2TH", "2 Thessalonians", ["2 thess", "2thess"]], ["1TI", "1 Timothy", ["1 tim", "1tim"]], ["2TI", "2 Timothy", ["2 tim", "2tim"]],
  ["TIT", "Titus", []], ["PHM", "Philemon", ["philem", "phm"]], ["HEB", "Hebrews", []], ["JAS", "James", ["jam", "jm"]],
  ["1PE", "1 Peter", ["1 pet", "1pet"]], ["2PE", "2 Peter", ["2 pet", "2pet"]], ["1JN", "1 John", ["1 jn", "1jn"]],
  ["2JN", "2 John", ["2 jn", "2jn"]], ["3JN", "3 John", ["3 jn", "3jn"]], ["JUD", "Jude", []], ["REV", "Revelation", ["revelations", "rev"]],
];
const norm = (s: string) =>
  s.toLowerCase().replace(/\./g, "").replace(/^(iii|ii|i)\s+/, (m) => ({ "iii ": "3 ", "ii ": "2 ", "i ": "1 " } as Record<string, string>)[m.toLowerCase()] ?? m)
    .replace(/^([123])(?=[a-z])/, "$1 ").replace(/\s+/g, " ").trim();
const ALIAS = new Map<string, number>();
BOOKS.forEach(([_, name, al], i) => [name, ...al].forEach((a) => ALIAS.set(norm(a), i)));

function resolveBook(raw: string): number {
  const n = norm(raw);
  if (ALIAS.has(n)) return ALIAS.get(n)!;
  const hits = BOOKS.map((b, i) => [norm(b[1]), i] as [string, number]).filter(([name]) => name.startsWith(n));
  if (hits.length === 1) return hits[0][1];
  throw new Error(`I don't recognize the book “${raw.trim()}”.`);
}

interface Ref { book: number; ch: number; v1?: number; ch2?: number; v2?: number }
function parseRef(s: string): Ref {
  const m = s.trim().replace(/[–—]/g, "-").match(/^(.+?)\s+(\d+)(?:\s*:\s*(\d+)(?:\s*-\s*(?:(\d+)\s*:\s*)?(\d+))?)?$/);
  if (!m) throw new Error(`I couldn't read “${s.trim()}” as a Bible reference.`);
  const r: Ref = { book: resolveBook(m[1]), ch: +m[2] };
  if (m[3]) { r.v1 = +m[3]; r.ch2 = m[5] ? (m[4] ? +m[4] : r.ch) : undefined; r.v2 = m[5] ? +m[5] : undefined; }
  return r;
}
const label = (r: Ref) => {
  const name = BOOKS[r.book][1] === "Psalms" ? "Psalm" : BOOKS[r.book][1];
  if (!r.v1) return `${name} ${r.ch}`;
  if (!r.v2) return `${name} ${r.ch}:${r.v1}`;
  return r.ch2 && r.ch2 !== r.ch ? `${name} ${r.ch}:${r.v1}–${r.ch2}:${r.v2}` : `${name} ${r.ch}:${r.v1}–${r.v2}`;
};
function passageId(r: Ref) {
  const id = BOOKS[r.book][0];
  if (!r.v1) return `${id}.${r.ch}`;
  if (!r.v2) return `${id}.${r.ch}.${r.v1}`;
  return `${id}.${r.ch}.${r.v1}-${id}.${r.ch2 ?? r.ch}.${r.v2}`;
}

// ---- API.Bible calls ----
async function api(path: string) {
  const key = Deno.env.get("BIBLE_API_KEY");
  if (!key) throw new Error("The BIBLE_API_KEY secret isn't set in Supabase.");
  let res: Response | null = null, body: any = {};
  for (const b of [base, ...BASES.filter((x) => x !== base)]) {
    try { res = await fetch(b + path, { headers: { "api-key": key } }); } catch (_) { continue; }
    body = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) { if (b !== BASES[BASES.length - 1]) continue; }
    base = b;
    break;
  }
  if (!res) throw new Error("Couldn't reach API.Bible.");
  if (res.status === 401) throw new Error("API.Bible rejected the key (401). Check that BIBLE_API_KEY is the key from your API.Bible app.");
  if (res.status === 403) throw new Error("API.Bible says this Bible isn't available to your key (403). Make sure it's added to your app.");
  if (res.status === 429) throw new Error("You've reached your API.Bible request limit for now.");
  if (!res.ok) throw new Error(`${body.message || "API.Bible error"} (${res.status})`);
  return body;
}
type Found = { id: string; name: string; abbreviation?: string };
let cachedBibles: Record<string, Found> | null = null;
let sample: Found[] = [];
const errors: Record<string, string> = {};
async function bibles() {
  if (cachedBibles) return cachedBibles;
  const out: Record<string, Found> = {};
  // 1) IDs you set as secrets are checked directly
  for (const w of WANTED) {
    const id = ENV_IDS[w];
    if (!id) continue;
    try { const d = (await api(`/bibles/${id}`)).data || {}; out[w] = { id, name: d.name || w, abbreviation: d.abbreviation }; }
    catch (e) { errors[w] = e instanceof Error ? e.message : String(e); }
  }
  // 2) everything else is found by name or abbreviation
  if (WANTED.some((w) => !out[w] && !errors[w])) {
    const list = (await api("/bibles?language=eng")).data || [];
    sample = list.slice(0, 12).map((b: any) => ({ id: b.id, name: b.name, abbreviation: b.abbreviation }));
    for (const b of list) {
      const abbr = String(b.abbreviationLocal || b.abbreviation || "").toUpperCase();
      const name = String(b.name || "");
      const hit = WANTED.find((w) => abbr === w || abbr.startsWith(w + " ")) || (/christian standard bible/i.test(name) ? "CSB" : null);
      if (hit && !out[hit]) out[hit] = { id: b.id, name, abbreviation: b.abbreviation };
    }
  }
  cachedBibles = out;
  return out;
}
async function bibleId(translation: string) {
  const env = ENV_IDS[translation];
  if (env) return env;
  const found = (await bibles())[translation];
  if (!found) throw new Error(`${translation} isn't enabled on your API.Bible account yet.`);
  return found.id;
}
const clean = (t: string) => String(t || "").replace(/¶/g, " ").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();
const keep = (t: string) => String(t || "").replace(/¶/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

async function fetchRef(translation: string, ref: Ref, given?: string, verseNumbers = false) {
  const id = ENV_IDS[translation] || given || await bibleId(translation);
  const q = `content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=${verseNumbers}&include-verse-spans=false&fums-version=3`;
  const path = ref.v1 ? `/bibles/${id}/passages/${passageId(ref)}?${q}` : `/bibles/${id}/chapters/${passageId(ref)}?${q.replace("include-titles=false", "include-titles=true")}`;
  const r = await api(path);
  const d = r.data || {};
  return {
    ok: true, translation, bibleId: id, reference: label(ref),
    text: ref.v1 ? clean(d.content) : keep(d.content),
    copyright: d.copyright || "", fumsToken: r.meta?.fumsToken || "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { action, translation = "CSB", ref, bibleId: given } = await req.json();
    if (action === "bibles") {
      const found = await bibles();
      return json({ ok: true, bibles: found, missing: WANTED.filter((w) => !found[w]), errors, sample });
    }
    if (!WANTED.includes(translation)) throw new Error("Unknown translation.");
    if (action === "passage") return json(await fetchRef(translation, parseRef(String(ref)), given));
    if (action === "chapter") {
      const r = parseRef(String(ref));
      return json(await fetchRef(translation, { book: r.book, ch: r.ch }, given, true));
    }
    if (action === "next") {
      const r = parseRef(String(ref));
      if (!r.v1) throw new Error("Pick a verse first.");
      const nextRef: Ref = { book: r.book, ch: r.ch2 ?? r.ch, v1: (r.v2 ?? r.v1) + 1 };
      try { return json(await fetchRef(translation, nextRef, given)); }
      catch (_) { return json({ ok: false, error: "That was the last verse in the chapter. Use Whole chapter, or type the next chapter." }); }
    }
    throw new Error("Unknown action.");
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
