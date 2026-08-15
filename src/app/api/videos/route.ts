import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { findBlockMatch } from "@/lib/contentFilter"
import { getSubscription, getUser, getVideos, itemToVideoRow } from "@/lib/data"
import { isChecklistComplete, newVideoItem, type VideoItem } from "@/lib/models"
import { planById } from "@/lib/plans"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  const videos = await getVideos(user.id)
  return NextResponse.json({ videos })
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Partial<VideoItem>
  const video: VideoItem = newVideoItem({
    ...body,
    id: body.id || undefined,
    views: typeof body.views === "number" ? body.views : 0,
  })

  // Blocco keyword scam: il video NON viene tracciato. Niente viene cancellato da TikTok.
  const block = findBlockMatch(video)
  if (block) {
    return NextResponse.json(
      {
        error: `Contenuto bloccato: "${block.keyword}" è una keyword vietata. I video scam vengono nascosti dal tracker — il video resta su TikTok (impostalo su "Solo io").`,
      },
      { status: 422 }
    )
  }

  // Checklist obbligatoria per stato "Pubblicato" (regola dell'app)
  if (video.status === "pubblicato" && !isChecklistComplete(video)) {
    return NextResponse.json(
      { error: "Completa tutti i punti della checklist prima di salvare come Pubblicato." },
      { status: 422 }
    )
  }

  if (!video.titolo.trim()) video.titolo = "Video senza titolo"

  // Limite del piano
  const subscription = await getSubscription(user.id)
  const limit = planById(subscription?.plan).limit
  const current = await getVideos(user.id)
  if (limit !== null && current.length >= limit) {
    return NextResponse.json(
      { error: `Limite del piano raggiunto (${limit} video). Passa a un piano superiore per continuare.` },
      { status: 403 }
    )
  }

  const supabase = createClient()
  const { error } = await supabase.from("tracked_videos").insert(itemToVideoRow(video, user.id))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ video }, { status: 201 })
}
