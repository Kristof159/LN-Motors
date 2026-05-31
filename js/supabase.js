// ===========================================================
// LN Motors — Supabase verbinding
// -----------------------------------------------------------
// Vervang de twee waarden hieronder door die van jouw project:
//   Supabase Dashboard → Project Settings → API
//     - Project URL      → SUPABASE_URL
//     - anon / public key → SUPABASE_ANON_KEY
//
// Let op: de anon (public) key hoort hier en is veilig om publiek
// te zijn. De beveiliging zit in Row Level Security + login.
// Zet hier NOOIT de service_role key.
// ===========================================================

const SUPABASE_URL = "https://dpwticvndwyishqnhiop.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwd3RpY3ZuZHd5aXNocW5oaW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDk3NjIsImV4cCI6MjA5NTc4NTc2Mn0.8cD4070UE0XVjAih56iz2PdEY-8k-C6Zdor5uXDW2vs";

// Maakt de Supabase client aan. `supabase` (kleine letter) komt van de
// CDN-library die in de HTML wordt geladen vóór dit bestand.
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper: zet een prijs (getal) om naar "€ 28.900"
function formatPrijs(prijs) {
  if (prijs == null || prijs === "") return "Prijs op aanvraag";
  return "€ " + Number(prijs).toLocaleString("nl-BE");
}
