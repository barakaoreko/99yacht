// ============================================================
// SUPABASE CLIENT — the single connection between this front end
// and your Supabase project. Every other script relies on the
// `window.sb` object created here.
//
// Where to find your values:
// Supabase dashboard → Project Settings → API
//   - Project URL         → SUPABASE_URL
//   - anon / public key   → SUPABASE_ANON_KEY  (safe to expose in
//                            front-end code — Row Level Security in
//                            supabase.sql is what actually guards the data)
//
// Wrapped in this "already exists?" guard so that if this script ever
// gets loaded or executed twice on the same page (browser extensions,
// live-reload tools, etc. sometimes do this), it just does nothing the
// second time instead of throwing a "already declared" error.
// ============================================================

if (!window.sb) {
  const SUPABASE_URL = "https://osbjfrcvqungwcvdlrdo.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zYmpmcmN2cXVuZ3djdmRscmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDAwOTksImV4cCI6MjEwMDMxNjA5OX0.PqVdlcwznPLnKdsNOr2KWFTr9HBLQbQdJZgEV0eMriA";

  // window.supabase here is the library loaded from the CDN <script> tag
  // in index.html (@supabase/supabase-js). We store our initialized
  // client as window.sb so the rest of the app can call
  // window.sb.from(...) / window.sb.auth... directly.
  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}