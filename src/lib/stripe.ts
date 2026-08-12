import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2024-06-20",
})

export function planFromPriceId(priceId: string | null | undefined): string {
  if (!priceId) return "free"
  if (process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID && priceId === process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID) {
    return "agency"
  }
  if (process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID && priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) {
    return "pro"
  }
  return "free"
}
