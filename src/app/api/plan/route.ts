import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/data"
import { uuid } from "@/lib/models"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  const items = await getPlanItems(user.id)
  return NextResponse.json({ items })
}

export async function PUT(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    items?: { weekday: number; topicID: number | null }[]
  }
  if (!Array.isArray(body.items) || body.items.length !== 7) {
    return NextResponse.json({ error: "Piano non valido" }, { status: 400 })
  }

  const items = body.items.map((i) => ({
    weekday: Math.min(Math.max(Number(i.weekday) || 1, 1), 7),
    topicID: i.topicID === null || i.topicID === undefined ? null : Number(i.topicID),
  }))

  const supabase = createClient()
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, email: user.email ?? null, weekly_plan: items, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ items })
}

async function getPlanItems(userId: string): Promise<{ id: string; weekday: number; topicID: number | null }[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("profiles")
    .select("weekly_plan")
    .eq("id", userId)
    .maybeSingle()
  const stored = (data?.weekly_plan as { weekday: number; topicID: number | null }[] | null) ?? []
  return stored.map((i) => ({ id: uuid(), weekday: i.weekday, topicID: i.topicID }))
}
