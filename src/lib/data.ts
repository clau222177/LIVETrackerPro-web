import { createClient } from "@/lib/supabase/server"
import type { VideoItem } from "@/lib/models"
import type { PlanId } from "@/lib/plans"

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
    console.error("[getSubscription] ERROR user:", userId, "->", error.code, error.message)
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
    .select("data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  return (rows ?? [])
    .map((row) => row.data as VideoItem | null)
    .filter((v): v is VideoItem => v !== null && typeof v === "object")
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
