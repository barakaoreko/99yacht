// ============================================================
// SUPABASE CLIENT — the single connection between this front end
// and your Supabase project. Every other script relies on the
// `supabase` object created here.
//
// Where to find your values:
// Supabase dashboard → Project Settings → API
//   - Project URL         → SUPABASE_URL
//   - anon / public key   → SUPABASE_ANON_KEY  (safe to expose in
//                            front-end code — Row Level Security in
//                            supabase.sql is what actually guards the data)
// ============================================================

const SUPABASE_URL = "https://osbjfrcvqungwcvdlrdo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zYmpmcmN2cXVuZ3djdmRscmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDAwOTksImV4cCI6MjEwMDMxNjA5OX0.PqVdlcwznPLnKdsNOr2KWFTr9HBLQbQdJZgEV0eMriA";

// window.supabase here is the library loaded from the CDN <script> tag
// in index.html (@supabase/supabase-js). We immediately overwrite the
// global with our initialized client so the rest of the app can just
// call `supabase.from(...)` / `supabase.auth...` directly.

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);