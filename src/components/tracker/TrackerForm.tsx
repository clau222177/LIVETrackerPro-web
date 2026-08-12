"use client"

import { useState } from "react"
import { Alert, Modal } from "@/components/ui/ui"
import { DEFAULT_CHECKLIST, STATUS_LABEL, TOPICS, VIDEO_STATUSES, topicLabel, type ChecklistItem, type VideoItem, type VideoStatus } from "@/lib/models"
import { isChecklistComplete } from "@/lib/models"
import { eur } from "@/lib/format"

export function TrackerForm({
  initial,
  defaultTopic,
  onClose,
  onSaved,
}: {
  initial: VideoItem | null
  defaultTopic?: number
  onClose: () => void
  onSaved: () => void
}) {
  const [titolo, setTitolo] = useState(initial?.titolo ?? "")
  const [topicID, setTopicID] = useState<number>(initial?.topicID ?? defaultTopic ?? 1)
  const [status, setStatus] = useState<VideoStatus>(initial?.status ?? "bozza")
  const [data, setData] = useState(() => {
    if (initial?.dataPubblicazione) return initial.dataPubblicazione.slice(0, 10)
    return new Date().toISOString().slice(0, 10)
  })
  const [link, setLink] = useState(initial?.linkTikTok ?? "")
  const [views, setViews] = useState(initial?.views?.toString() ?? "0")
  const [guadagno, setGuadagno] = useState(initial ? initial.guadagno.toString() : "")
  const [note, setNote] = useState(initial?.note ?? "")
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    initial?.checklist?.length ? initial.checklist.map((c) => ({ ...c })) : DEFAULT_CHECKLIST.map((c) => ({ ...c }))
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const checklistDone = isChecklistComplete({ checklist })
  const isEdit = initial !== null
  const suggestedReward = TOPICS.find((t) => t.id === topicID)?.rewardPerVideo ?? 0

  const toggleChecklist = (id: string) => {
    setChecklist((items) => items.map((c) => (c.id === id ? { ...c, isDone: !c.isDone } : c)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (status === "pubblicato" && !checklistDone) {
      setError("Per salvare il video come Pubblicato devi completare tutti i punti della checklist.")
      return
    }

    const video: VideoItem = {
      id: initial?.id ?? crypto.randomUUID(),
      titolo: titolo.trim() || "Video senza titolo",
      topicID,
      status,
      dataPubblicazione: data ? new Date(`${data}T12:00:00`).toISOString() : null,
      linkTikTok: link.trim(),
      guadagno: parseFloat(guadagno.replace(",", ".")) || 0,
      note,
      checklist,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      views: parseInt(views, 10) || 0,
    }

    setSaving(true)
    try {
      const res = await fetch(isEdit ? `/api/videos/${video.id}` : "/api/videos", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(video),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Errore durante il salvataggio.")
        return
      }
      onSaved()
    } catch {
      setError("Errore di rete.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? "Modifica video" : "Nuovo video"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <div>
          <label className="label">Titolo del video</label>
          <input className="input" value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="LIVE in 3 tap" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Argomento</label>
            <select className="input" value={topicID} onChange={(e) => setTopicID(Number(e.target.value))}>
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {topicLabel(t.id)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Stato</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as VideoStatus)}>
              {VIDEO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Data pubblicazione</label>
            <input type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <label className="label">Visualizzazioni</label>
            <input type="number" min="0" className="input" value={views} onChange={(e) => setViews(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Guadagno (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={guadagno}
              onChange={(e) => setGuadagno(e.target.value)}
              placeholder={`Suggerito: ${eur(suggestedReward)}`}
            />
          </div>
          <div>
            <label className="label">Link TikTok</label>
            <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://tiktok.com/..." />
          </div>
        </div>

        <div>
          <label className="label">Note (es. motivo di rifiuto)</label>
          <textarea className="input min-h-[70px] resize-y" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="rounded-xl border border-line bg-surface2 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wide text-muted">
              {status === "pubblicato" ? "Checklist obbligatoria per Pubblicato" : "Checklist approvazione"}
            </div>
            {checklistDone && status === "pubblicato" && <span className="text-xs font-bold text-success">Completa ✓</span>}
          </div>
          <div className="space-y-1">
            {checklist.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                    item.isDone ? "border-brand bg-brand text-white" : "border-line text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className={`text-sm ${item.isDone ? "text-white line-through" : "text-muted"}`}>{item.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Annulla
          </button>
          <button type="submit" disabled={saving} className="btn-brand flex-1">
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </form>
    </Modal>
  )
}
