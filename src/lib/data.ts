import { createClient } from "@/lib/supabase/server"
import type { VideoItem } from "@/lib/models"
import type { PlanId } from "@/lib/plans"

export type SubscriptionRow = {
  id?: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: PlanId
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

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) {
    console.error("[getSubscription] ERROR user:", userId, "->", error.code, error.message)
  } else {
    console.log(
      "[getSubscription] user:",
      userId,
      "->",
      data ? `plan=${(data as SubscriptionRow).plan} status=${(data as SubscriptionRow).status}` : "no row (free)"
    )
  }
  return (data as SubscriptionRow | null) ?? null
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
