"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Alert, ProgressBar, StatBox } from "@/components/ui/ui"
import { createClient } from "@/lib/supabase/client"
import { TOPICS, topicLabel } from "@/lib/models"
import {
  approvatiCount,
  inRevisioneCount,
  monthlyProjection,
  percentClaimed,
  totalGuadagno,
  videosRemaining,
  totalPool,
} from "@/lib/video-store"
import { eur } from "@/lib/format"
import type { VideoItem } from "@/lib/models"
import type { PlanId } from "@/lib/plans"

export function Dashboard({
  videos,
  planId,
}: {
  videos: VideoItem[]
  planId: PlanId
}) {
  const router = useRouter()
  const [videosPerDay, setVideosPerDay] = useState(2)
  const [banner, setBanner] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("checkout") === "success") {
      setBanner("Pagamento riuscito. Benvenuto in LIVE Tracker Pro!")
      ;(async () => {
        const supabase = createClient()
        try {
          await supabase.auth.refreshSession()
        } catch {
          // ignora: la sessione verrà comunque ricaricata sotto
        }
        setTimeout(() => router.refresh(), 2500)
      })()
    }
    if (params.get("confirmed") === "1") {
      setBanner("Email confermata con successo. Benvenuto!")
    }
  }, [router])

  const total = totalPool()
  const earned = totalGuadagno(videos)
  const claimed = total + earned > 0 ? earned / (total + earned) : 0

  return (
    <div className="space-y-6">
      {banner && <Alert tone="success">{banner}</Alert>}

      {/* Card ricompense totali */}
      <div className="rounded-3xl bg-gradient-to-br from-brand to-brand/50 p-7 text-white">
        <div className="text-sm font-semibold text-white/85">Le tue ricompense totali</div>
        <div className="mt-1 text-5xl font-black tracking-tight">{eur(earned)}</div>
        <div className="mt-2 text-xs text-white/70">
          Programma Incentivi LIVE · Pool totale disponibile
        </div>
      </div>

      <div className="flex gap-3">
        <StatBox value={`${approvatiCount(videos)}`} label="Video approvati" color="text-success" />
        <StatBox value={`${inRevisioneCount(videos)}`} label="In revisione" color="text-warning" />
      </div>

      {/* Topic */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Argomenti del programma</h2>
        {TOPICS.map((topic) => {
          const pct = percentClaimed(videos, topic.id)
          const remaining = videosRemaining(videos, topic.id)
          return (
            <div key={topic.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-brand">{topicLabel(topic.id)}</div>
                  <div className="mt-0.5 font-bold text-white">{topic.title}</div>
                </div>
                <button
                  onClick={() => router.push(`/tracker?topic=${topic.id}`)}
                  className="chip bg-brand text-white hover:bg-brand/85"
                >
                  Vedi
                </button>
              </div>
              <div className="mt-3 text-sm">
                <span className="font-bold text-white">{eur(topic.rewardPerVideo)}</span>
                <span className="text-muted"> / video</span>
              </div>
              <div className="mt-3">
                <ProgressBar value={pct} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span className="text-brand">{Math.round(pct * 100)}% del pool</span>
                <span>Ancora {remaining} video</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pool */}
      <div className="card p-5">
        <h2 className="text-base font-bold text-white">Pool incentivi</h2>
        <div className="mt-3">
          <ProgressBar value={claimed} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span className="text-brand">{Math.round(claimed * 100)}% del pool ottenuto</span>
          <span>Rimangono {eur(total)}</span>
        </div>
        <p className="mt-3 text-sm font-bold text-white">
          Puoi ancora guadagnare fino a {eur(Math.max(total - earned, 0))} prima che il pool finisca.
        </p>
      </div>

      {/* Calcolatore mensile */}
      <div className="card p-5">
        <h2 className="text-base font-bold text-white">Calcolatore mensile</h2>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">{videosPerDay} video/giorno</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setVideosPerDay((v) => Math.max(0, v - 1))}
              className="h-8 w-8 rounded-lg border border-line bg-surface2 font-bold text-white hover:bg-white/10"
            >
              −
            </button>
            <button
              onClick={() => setVideosPerDay((v) => Math.min(10, v + 1))}
              className="h-8 w-8 rounded-lg border border-line bg-surface2 font-bold text-white hover:bg-white/10"
            >
              +
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm font-bold text-white">
          Se pubblichi {videosPerDay} video al giorno, guadagni {eur(monthlyProjection(videosPerDay))} al mese.
        </p>
        {planId === "free" && videos.length >= 3 && (
          <div className="mt-4">
            <Alert tone="info">
              Hai raggiunto il limite Free (3 video).{" "}
              <button onClick={() => router.push("/pricing")} className="underline">
                Passa a Pro
              </button>{" "}
              per video illimitati.
            </Alert>
          </div>
        )}
      </div>
    </div>
  )
}
