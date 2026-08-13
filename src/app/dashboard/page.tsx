import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { AppShell } from "@/components/AppShell"
import { Dashboard } from "@/components/dashboard/Dashboard"
import { getUser, getSubscription, getProfile, getVideos } from "@/lib/data"
import { planById } from "@/lib/plans"

export const metadata: Metadata = { title: "Dashboard" }

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect("/login")

  const [videos, subscription, profile] = await Promise.all([
    getVideos(user.id),
    getSubscription(user.id),
    getProfile(user.id),
  ])
  const planId = subscription?.plan ?? "free"
  const plan = planById(planId)
  const userEmail = user.email ?? ""

  console.log(
    "[dashboard] PLAN DEBUG server:",
    JSON.stringify({
      userId: user.id,
      email: userEmail,
      planId,
      dbPlan: subscription?.plan ?? null,
      dbStatus: subscription?.status ?? null,
      profilePlanType: profile?.plan_type ?? null,
      profileIsPremium: profile?.is_premium ?? null,
    })
  )

  return (
    <AppShell email={userEmail} planLabel={plan.name}>
      <Dashboard videos={videos} planId={planId} email={userEmail} />
    </AppShell>
  )
}
