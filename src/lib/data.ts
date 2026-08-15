import { createClient } from "@/lib/supabase/server"
import { hideScamVideos } from "@/lib/contentFilter"
import { DEFAULT_CHECKLIST, topicLabel, uuid, type ChecklistItem, type VideoItem, type VideoStatus } from "@/lib/models"
import type { PlanId } from "@/lib/plans"

export type TrackedVideoRow = {
  id: string
  user_id: string
  title: string | null
  topic: string | null
  status: string | null
  publish_date: string | null
  views: number | null
  earnings: number | string | null
  tiktok_link: string | null
  notes: string | null
  checklist: unknown
  rejection_reason: string | null
  created_at: string | null
  updated_at: string | null
  video_id?: string | null
  data?: unknown
}

const VIDEO_STATUS_KEYS: VideoStatus[] = ["bozza", "pubblicato", "inRevisione", "approvato", "rifiutato"]

export function videoRowToItem(row: TrackedVideoRow): VideoItem {
  const fallback = (row.data ?? {}) as Partial<VideoItem>
  const status = VIDEO_STATUS_KEYS.includes(row.status as VideoStatus)
    ? (row.status as VideoStatus)
    : (fallback.status ?? "bozza")
  const topicID = row.topic === "Topic 2" ? 2 : typeof fallback.topicID === "number" ? fallback.topicID : 1
  return {
    id: row.id ?? fallback.id ?? uuid(),
    titolo: row.title ?? fallback.titolo ?? "Video senza titolo",
    topicID,
    status,
    dataPubblicazione: row.publish_date ?? fallback.dataPubblicazione ?? null,
    linkTikTok: row.tiktok_link ?? fallback.linkTikTok ?? "",
    guadagno: row.earnings != null ? Number(row.earnings) : (fallback.guadagno ?? 0),
    note: row.notes ?? fallback.note ?? "",
    checklist:
      Array.isArray(row.checklist) && row.checklist.length > 0
        ? (row.checklist as ChecklistItem[])
        : (fallback.checklist ?? DEFAULT_CHECKLIST.map((c) => ({ ...c }))),
    createdAt: row.created_at ?? fallback.createdAt ?? new Date().toISOString(),
    views: row.views != null ? Number(row.views) : (fallback.views ?? 0),
  }
}

export function itemToVideoRow(video: VideoItem): Record<string, unknown> {
  return {
    id: video.id,
    title: video.titolo,
    topic: topicLabel(video.topicID),
    status: video.status,
    publish_date: video.dataPubblicazione ? video.dataPubblicazione.slice(0, 10) : null,
    views: video.views,
    earnings: video.guadagno,
    tiktok_link: video.linkTikTok || null,
    notes: video.note || null,
    checklist: video.checklist,
    rejection_reason: null,
  }
}

export type SubscriptionRow = {
  id?: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: PlanId
  plan_type?: string | null
  status: string
  current_period_end: string | null
  created_at?: string
  updated_at?: string
}

export async function getUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export function normalizeSubscriptionRow(row: Record<string, unknown> | null | undefined): SubscriptionRow | null {
  if (!row) return null
  const plan = (row.plan_type ?? row.plan ?? "free") as PlanId
  return { ...(row as unknown as SubscriptionRow), plan }
}

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) {
    const { data: rows } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
    if (rows && rows.length > 0) {
      return normalizeSubscriptionRow(rows[0] as Record<string, unknown>)
    }
    return null
  }
  const row = normalizeSubscriptionRow(data as Record<string, unknown> | null)
  if (row) {
    return row
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type, is_premium")
    .eq("id", userId)
    .maybeSingle()
  if (profile?.plan_type && profile.plan_type !== "free") {
    return {
      user_id: userId,
      plan: profile.plan_type as PlanId,
      status: profile.is_premium ? "active" : "inactive",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      current_period_end: null,
    }
  }
  return null
}

export async function getProfile(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle()
  if (error) {
    console.error("[getProfile] ERROR user:", userId, "->", error.code, error.message)
  }
  return data
}

export async function getVideos(userId: string): Promise<VideoItem[]> {
  const supabase = createClient()
  const { data: rows } = await supabase
    .from("tracked_videos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  return hideScamVideos((rows ?? []).map((row) => videoRowToItem(row as TrackedVideoRow)))
}

export async function getWeeklyPlan(userId: string): Promise<{ weekday: number; topicID: number | null }[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("weekly_plan")
    .eq("id", userId)
    .maybeSingle()
  if (error) {
    console.error("[getWeeklyPlan] ERROR user:", userId, "->", error.code, error.message)
  }
  const items = data?.weekly_plan as { weekday: number; topicID: number | null }[] | null
  return Array.isArray(items) ? items : []
}
