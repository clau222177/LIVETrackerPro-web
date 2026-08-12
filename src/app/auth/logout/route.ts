import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const supabase = createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(`${base}/`)
}
