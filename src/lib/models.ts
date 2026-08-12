// Port of Models/ (VideoStatus.swift, Topic.swift, ChecklistItem.swift, VideoItem.swift, WeekPlan.swift)

export type Topic = {
  id: number
  title: string
  rewardPerVideo: number
  remainingPool: number
}

export const TOPICS: Topic[] = [
  {
    id: 1,
    title: "Mostra quanto è facile andare LIVE",
    rewardPerVideo: 156.05,
    remainingPool: 8666.51,
  },
  {
    id: 2,
    title: "Guida i principianti nella loro prima LIVE",
    rewardPerVideo: 104.03,
    remainingPool: 8657.99,
  },
]

export function topicById(id: number): Topic {
  return TOPICS.find((t) => t.id === id) ?? TOPICS[0]
}

export function topicLabel(id: number): string {
  return id === 1 ? "Topic 1" : "Topic 2"
}

export type VideoStatus =
  | "bozza"
  | "pubblicato"
  | "inRevisione"
  | "approvato"
  | "rifiutato"

export const VIDEO_STATUSES: VideoStatus[] = [
  "bozza",
  "pubblicato",
  "inRevisione",
  "approvato",
  "rifiutato",
]

export const STATUS_LABEL: Record<VideoStatus, string> = {
  bozza: "Bozza",
  pubblicato: "Pubblicato",
  inRevisione: "In revisione",
  approvato: "Approvato",
  rifiutato: "Rifiutato",
}

export const STATUS_COLOR: Record<VideoStatus, string> = {
  bozza: "#8A8A8E",
  pubblicato: "#0A84FF",
  inRevisione: "#FFD60A",
  approvato: "#25D366",
  rifiutato: "#FF3B30",
}

export type ChecklistItem = {
  id: string
  title: string
  isDone: boolean
}

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "c1", title: 'Ho detto a voce "andare LIVE" / "prima LIVE"', isDone: false },
  { id: "c2", title: "Ho mostrato screen recording del bottone LIVE", isDone: false },
  { id: "c3", title: "Video più lungo di 15 secondi", isDone: false },
  { id: "c4", title: "Video senza watermark", isDone: false },
  { id: "c5", title: "Hashtag #LIVE e #TikTokLIVE", isDone: false },
]

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export type VideoItem = {
  id: string
  titolo: string
  topicID: number
  status: VideoStatus
  dataPubblicazione: string | null
  linkTikTok: string
  guadagno: number
  note: string
  checklist: ChecklistItem[]
  createdAt: string
  views: number
}

export function newVideoItem(partial: Partial<VideoItem> = {}): VideoItem {
  return {
    id: uuid(),
    titolo: "",
    topicID: 1,
    status: "bozza",
    dataPubblicazione: null,
    linkTikTok: "",
    guadagno: 0,
    note: "",
    checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c })),
    createdAt: new Date().toISOString(),
    views: 0,
    ...partial,
  }
}

export function isChecklistComplete(v: Pick<VideoItem, "checklist">): boolean {
  return v.checklist.length > 0 && v.checklist.every((c) => c.isDone)
}

export type WeekPlanItem = {
  id: string
  weekday: number
  topicID: number | null
}

export type WeekPlan = {
  items: WeekPlanItem[]
}

export const WEEKDAY_NAMES = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
]

export const DEFAULT_PLAN_TOPICS: (number | null)[] = [1, 2, 1, 2, 1, null, null]

export function defaultWeekPlan(): WeekPlan {
  return {
    items: DEFAULT_PLAN_TOPICS.map((topicID, index) => ({
      id: uuid(),
      weekday: index + 1,
      topicID,
    })),
  }
}

export function planTopicFor(plan: WeekPlan | null | undefined, weekday: number): number | null {
  return plan?.items.find((i) => i.weekday === weekday)?.topicID ?? null
}
