import Link from "next/link"
import type { Metadata } from "next"
import { Crown, ArrowLeft } from "lucide-react"
import { PricingCards } from "@/components/PricingCards"
import { getUser, getSubscription } from "@/lib/data"
import { planById } from "@/lib/plans"

export const metadata: Metadata = { title: "Prezzi" }

export const dynamic = "force-dynamic"

export default async function PricingPage() {
  const user = await getUser()
  const subscription = user ? await getSubscription(user.id) : null
  const currentPlan = subscription?.plan ?? "free"
  const isSubscribed = subscription?.status === "active" && currentPlan !== "free"

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
            <Crown size={18} className="text-white" />
          </span>
          <span>LIVE Tracker Pro</span>
        </Link>
        <Link href={user ? "/dashboard" : "/login"} className="btn-ghost !py-2">
          {user ? "Dashboard" : "Accedi"}
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-14">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black tracking-tight">Scegli il tuo piano</h1>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Inizia gratis e passa a Pro quando la tua strategia TikTok cresce. Cancellazione in qualsiasi momento.
          </p>
          {isSubscribed && (
            <div className="mx-auto mt-5 max-w-md rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
              Hai un abbonamento {planById(currentPlan).name} attivo.
            </div>
          )}
        </div>

        <PricingCards currentPlan={currentPlan} isSubscribed={isSubscribed} />

        <div className="mt-12 text-center text-sm text-muted">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-white">
            <ArrowLeft size={14} /> Torna alla home
          </Link>
        </div>
      </main>
    </div>
  )
}
