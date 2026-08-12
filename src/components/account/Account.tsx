"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, ExternalLink, LogOut } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { Alert, StatBox } from "@/components/ui/ui"
import { planById, type PlanId } from "@/lib/plans"
import { fullDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"

export function Account({
  email,
  planId,
  status,
  periodEnd,
  isSubscribed,
}: {
  email: string
  planId: PlanId
  status: string
  periodEnd: string | null
  isSubscribed: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const plan = planById(planId)

  const openPortal = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/portal", { method: "POST" })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error ?? "Errore.")
    } catch {
      setError("Errore di rete.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const statusLabel: Record<string, string> = {
    active: "Attivo",
    trialing: "Prova",
    past_due: "In ritardo",
    cancelled: "Annullato",
    pending: "In attesa",
    incomplete: "Incompleto",
  }

  return (
    <AppShell email={email} planLabel={plan.name}>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Account</h1>
        <p className="mt-1 text-sm text-muted">{email}</p>
      </div>

      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <div className="card p-6">
          <h2 className="text-base font-bold text-white">Il tuo piano</h2>
          <div className="mt-4 flex gap-3">
            <StatBox value={plan.name} label="Piano" color="text-brand" />
            <StatBox
              value={statusLabel[status] ?? status}
              label="Stato abbonamento"
              color={status === "active" ? "text-success" : "text-warning"}
            />
          </div>
          <div className="mt-4 text-sm text-muted">
            {periodEnd ? (
              <>
                Prossimo rinnovo: <span className="font-semibold text-white">{fullDate(periodEnd)}</span>
              </>
            ) : isSubscribed ? (
              "Abbonamento attivo"
            ) : (
              "Sei sul piano gratuito"
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {isSubscribed ? (
              <button onClick={openPortal} disabled={loading} className="btn-brand">
                <CreditCard size={16} /> Gestisci abbonamento
                <ExternalLink size={14} />
              </button>
            ) : (
              <button onClick={() => router.push("/pricing")} className="btn-brand">
                Passa a Pro
              </button>
            )}
            <button onClick={handleLogout} className="btn-ghost">
              <LogOut size={16} /> Esci
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-bold text-white">Limiti del piano</h2>
          <p className="mt-2 text-sm text-muted">
            {plan.limit === null
              ? "Video illimitati: puoi tracciare quanti video vuoi."
              : `Puoi tracciare fino a ${plan.limit} video. Supera il limite per sbloccare un piano superiore.`}
          </p>
        </div>
      </div>
    </AppShell>
  )
}
