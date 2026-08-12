export type PlanId = "free" | "pro" | "agency"

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
    id: "pro",
    name: "Pro",
    tagline: "Per creator in crescita",
    price: 19,
    priceLabel: "19 € / mese",
    limit: 100,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "",
    features: [
      "100 video tracciati",
      "Tutto del piano Free",
      "Statistiche avanzate",
      "Calendario pianificazione",
      "Supporto prioritario",
    ],
    highlighted: true,
  },
  {
    id: "agency",
    name: "Agency",
    tagline: "Per team e agenzie",
    price: 49,
    priceLabel: "49 € / mese",
    limit: null,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID ?? "",
    features: [
      "Video illimitati",
      "Tutto del piano Pro",
      "Gestione multi-creator",
      "Statistiche illimitate",
    ],
  },
]

export function planById(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0]
}

export function planLimit(id: string | null | undefined): number | null {
  return planById(id).limit
}
