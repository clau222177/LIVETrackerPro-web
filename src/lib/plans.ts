export type PlanId = "free" | "base" | "pro"

export type Plan = {
  id: PlanId
  name: string
  tagline: string
  price: number
  priceLabel: string
  limit: number | null
  stripePriceId: string
  features: string[]
  highlighted?: boolean
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Per iniziare",
    price: 0,
    priceLabel: "0 €",
    limit: 3,
    stripePriceId: "",
    features: [
      "3 video tracciati",
      "Dashboard ricompense",
      "Checklist approvazione",
      "Tracker status video",
    ],
  },
  {
    id: "base",
    name: "Base",
    tagline: "Per creator che iniziano a crescere",
    price: 9.99,
    priceLabel: "9,99 € / mese",
    limit: 30,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASE ?? "",
    features: [
      "30 video tracciati",
      "Tutto del piano Free",
      "Statistiche avanzate",
      "Calendario pianificazione",
      "Supporto email",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Per creator in crescita",
    price: 19.99,
    priceLabel: "19,99 € / mese",
    limit: 100,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "",
    features: [
      "100 video tracciati",
      "Tutto del piano Base",
      "Statistiche illimitate",
      "Calendario pianificazione",
      "Supporto prioritario",
    ],
    highlighted: true,
  },
]

export function planById(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0]
}

export function planByPriceId(priceId: string | null | undefined): Plan | undefined {
  if (!priceId) return undefined
  return PLANS.find((p) => p.stripePriceId === priceId)
}

export function planLimit(id: string | null | undefined): number | null {
  return planById(id).limit
}
