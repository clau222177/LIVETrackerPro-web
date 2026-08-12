import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { Suspense } from "react"
import { AppShell } from "@/components/AppShell"
import { Tracker } from "@/components/tracker/Tracker"
import { getUser, getSubscription, getVideos } from "@/lib/data"
import { planById, planLimit } from "@/lib/plans"

export const metadata: Metadata = { title: "Video Tracker" }

export const dynamic = "force-dynamic"

export default async function TrackerPage() {
  const user = await getUser()
  if (!user) redirect("/login")

  const [videos, subscription] = await Promise.all([getVideos(user.id), getSubscription(user.id)])
  const planId = subscription?.plan ?? "free"
  const plan = planById(planId)
  const limit = planLimit(planId)

  return (
    <AppShell email={user.email ?? ""} planLabel={plan.name}>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Video Tracker</h1>
        <p className="mt-1 text-sm text-muted">
          {videos.length} video tracciati · limite {limit === null ? "illimitato" : limit} ({plan.name})
        </p>
      </div>
      <Suspense fallback={null}>
        <Tracker videos={videos} planId={planId} limit={limit} />
      </Suspense>
    </AppShell>
  )
}
