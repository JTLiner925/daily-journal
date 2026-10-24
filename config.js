// Public settings for sign-in. Both values are safe to publish:
// the anon key only works within the Row Level Security rules in supabase/schema.sql.
// Never put the service_role key, Notion token or ESV key in this file.
window.JOURNAL_CONFIG = {
  url: '',      // e.g. https://abcdxyz.supabase.co
  anonKey: ''   // Project Settings → API → "anon" public key
};
