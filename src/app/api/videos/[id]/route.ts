import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/data"
import { isChecklistComplete, type VideoItem } from "@/lib/models"

export const dynamic = "force-dynamic"

type Params = { params: { id: string } }

export async function PUT(request: Request, { params }: Params) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const video = (await request.json().catch(() => ({}))) as VideoItem
  if (!video || !video.id) {
    return NextResponse.json({ error: "Video non valido" }, { status: 400 })
  }

  if (video.status === "pubblicato" && !isChecklistComplete(video)) {
    return NextResponse.json(
      { error: "Completa tutti i punti della checklist prima di salvare come Pubblicato." },
      { status: 422 }
    )
  }

  const supabase = createClient()
  const { error } = await supabase
    .from("tracked_videos")
    .update({
      title: video.titolo,
      views: video.views ?? 0,
      data: video,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("video_id", video.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ video })
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const supabase = createClient()
  const { error } = await supabase
    .from("tracked_videos")
    .delete()
    .eq("user_id", user.id)
    .eq("video_id", params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
