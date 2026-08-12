"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Alert, Badge, EmptyState } from "@/components/ui/ui"
import { TrackerForm } from "@/components/tracker/TrackerForm"
import {
  STATUS_COLOR,
  STATUS_LABEL,
  VIDEO_STATUSES,
  topicLabel,
  type VideoItem,
  type VideoStatus,
} from "@/lib/models"
import { eur, shortDate } from "@/lib/format"
import type { PlanId } from "@/lib/plans"

export function Tracker({
  videos,
  planId,
  limit,
}: {
  videos: VideoItem[]
  planId: PlanId
  limit: number | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const topicParam = searchParams.get("topic")

  const [filter, setFilter] = useState<VideoStatus | "tutti">("tutti")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<VideoItem | null>(null)
  const [deleting, setDeleting] = useState<VideoItem | null>(null)
  const [limitError, setLimitError] = useState<string | null>(null)

  const activeTopic = useMemo(() => {
    const parsed = topicParam ? Number(topicParam) : NaN
    return Number.isFinite(parsed) ? parsed : null
  }, [topicParam])

  const filtered = videos.filter((v) => {
    const topicMatch = activeTopic === null || v.topicID === activeTopic
    const statusMatch = filter === "tutti" || v.status === filter
    return topicMatch && statusMatch
  })

  const atLimit = limit !== null && videos.length >= limit

  const refresh = () => {
    setFormOpen(false)
    setEditing(null)
    router.refresh()
  }

  const openCreate = () => {
    setLimitError(null)
    if (atLimit) {
      setLimitError(
        `Limite del piano raggiunto (${limit} video). Passa a un piano superiore per continuare.`
      )
      return
    }
    setEditing(null)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleting) return
    await fetch(`/api/videos/${deleting.id}`, { method: "DELETE" })
    setDeleting(null)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {activeTopic !== null && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-white">
            Topic {activeTopic}: <span className="text-muted">filtro attivo</span>
          </div>
          <button onClick={() => router.push("/tracker")} className="btn-ghost !py-1.5 text-xs">
            Rimuovi filtro
          </button>
        </div>
      )}

      {atLimit && (
        <Alert tone="info">
          Hai raggiunto il limite di {limit} video del piano {planId === "free" ? "Free" : "corrente"}.{" "}
          <button onClick={() => router.push("/pricing")} className="underline">
            Passa a Pro o Agency
          </button>{" "}
          per tracciare di più.
        </Alert>
      )}
      {limitError && (
        <Alert>
          {limitError}{" "}
          <button onClick={() => router.push("/pricing")} className="underline">
            Passa a Pro
          </button>
        </Alert>
      )}

      {/* Filtri */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("tutti")}
            className={`chip ${filter === "tutti" ? "bg-brand text-white" : "bg-surface text-muted hover:text-white"}`}
          >
            Tutti
          </button>
          {VIDEO_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? "tutti" : s)}
              className={`chip ${filter === s ? "bg-brand text-white" : "bg-surface text-muted hover:text-white"}`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="btn-brand">
          <Plus size={16} /> Nuovo video
        </button>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🎬"
            title="Nessun video"
            subtitle="Tocca “Nuovo video” per aggiungere il primo video del programma."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((video) => (
            <div key={video.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[video.status] }}
                  />
                  <div className="truncate font-bold text-white">{video.titolo}</div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Badge color={STATUS_COLOR[video.status]}>{STATUS_LABEL[video.status]}</Badge>
                  <span>{topicLabel(video.topicID)}</span>
                  <span>·</span>
                  <span>{shortDate(video.dataPubblicazione)}</span>
                  {video.views > 0 && (
                    <>
                      <span>·</span>
                      <span>{video.views.toLocaleString("it-IT")} 👀</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-brand">{eur(video.guadagno)}</div>
                <div className="mt-1 flex items-center justify-end gap-1">
                  <button
                    onClick={() => {
                      setEditing(video)
                      setFormOpen(true)
                    }}
                    className="rounded-lg p-2 text-muted hover:bg-white/10 hover:text-white"
                    title="Modifica"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleting(video)}
                    className="rounded-lg p-2 text-muted hover:bg-danger/15 hover:text-danger"
                    title="Elimina"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <TrackerForm
          initial={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSaved={refresh}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6">
            <h3 className="text-base font-bold text-white">Eliminare questo video?</h3>
            <p className="mt-2 text-sm text-muted">Questa azione non può essere annullata.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setDeleting(null)} className="btn-ghost flex-1">
                Annulla
              </button>
              <button onClick={handleDelete} className="btn-brand flex-1 !bg-danger hover:!bg-danger/85">
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
