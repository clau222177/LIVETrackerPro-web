import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { AppShell } from "@/components/AppShell"
import { Dashboard } from "@/components/dashboard/Dashboard"
import { getUser, getSubscription, getVideos } from "@/lib/data"
import { planById } from "@/lib/plans"

export const metadata: Metadata = { title: "Dashboard" }

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect("/login")

  const [videos, subscription] = await Promise.all([getVideos(user.id), getSubscription(user.id)])
  const planId = subscription?.plan ?? "free"
  const plan = planById(planId)

  return (
    <AppShell email={user.email ?? ""} planLabel={plan.name}>
      <Dashboard videos={videos} planId={planId} />
    </AppShell>
  )
}
