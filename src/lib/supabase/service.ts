import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | null = null

// Client con la Service Role Key: bypassa le RLS. SOLO per webhook / amministrazione.
export function serviceClient(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error("Mancano le variabili NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY")
  }
  cached = createSupabaseClient(url, key, { auth: { persistSession: false } })
  return cached
}
