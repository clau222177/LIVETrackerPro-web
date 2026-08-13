import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2024-06-20",
})

export function planFromPriceId(priceId: string | null | undefined): string {
  if (!priceId) return "free"
  if (process.env.NEXT_PUBLIC_STRIPE_PRICE_BASE && priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_BASE) {
    return "base"
  }
  if (process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO && priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) {
    return "pro"
  }
  return "free"
}
