"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Sparkles } from "lucide-react"
import { PLANS, type Plan, type PlanId } from "@/lib/plans"

export function PricingCards({
  currentPlan,
  isSubscribed,
}: {
  currentPlan: PlanId
  isSubscribed: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (plan: Plan) => {
    setError(null)

    if (isSubscribed) {
      setLoading("portal")
      try {
        const res = await fetch("/api/portal", { method: "POST" })
        const data = await res.json()
        if (data.url) window.location.href = data.url
        else setError(data.error ?? "Errore nell'apertura della gestione abbonamento.")
      } catch {
        setError("Errore di rete.")
      } finally {
        setLoading(null)
      }
      return
    }

    setLoading(plan.id)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.stripePriceId }),
      })
      const data = await res.json()
      if (res.status === 401) {
        router.push("/login?signup=1")
        return
      }
      if (data.url) window.location.href = data.url
      else setError(data.error ?? "Errore nell'avvio del pagamento.")
    } catch {
      setError("Errore di rete.")
    } finally {
      setLoading(null)
    }
  }

  const plans = PLANS.filter((p) => p.id !== "free")

  return (
    <div>
      {error && (
        <div className="mx-auto mb-8 max-w-xl rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </div>
      )}
      <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan
          return (
            <div
              key={plan.id}
              className={`card relative flex flex-col p-6 ${
                plan.highlighted ? "border-brand/60 shadow-[0_0_40px_-12px_rgba(255,46,99,0.5)]" : ""
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
                  <Sparkles size={12} /> Consigliato
                </span>
              )}
              <div className="font-bold text-white">{plan.name}</div>
              <div className="mt-1 text-xs text-muted">{plan.tagline}</div>
              <div className="mt-4 text-3xl font-black text-white">
                {plan.price === 0 ? "Gratis" : `${plan.priceLabel.replace(" € / mese", "")} €`}
                <span className="text-sm font-semibold text-muted"> / mese</span>
              </div>
              <div className="mt-2 text-xs text-muted">
                {plan.limit === null ? "Video illimitati" : `${plan.limit} video tracciati`}
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted">
                    <Check size={16} className="mt-0.5 shrink-0 text-brand" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleAction(plan)}
                disabled={loading !== null}
                className="btn-brand mt-6 w-full"
              >
                {loading === plan.id || loading === "portal"
                  ? "Attendere..."
                  : isCurrent
                    ? "Gestisci abbonamento"
                    : "Abbonati ora"}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
