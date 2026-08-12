import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

type SetCookieArg = { name: string; value: string; options: CookieOptions }

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      "Mancano le variabili NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (vedi .env.example)"
    )
  }

  const cookieStore = cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: SetCookieArg[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Chiamato da un Server Component: il cookie è già stato scritto a runtime.
        }
      },
    },
  })
}
