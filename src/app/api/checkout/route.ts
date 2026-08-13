import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/data"
import { stripe } from "@/lib/stripe"
import { planByPriceId } from "@/lib/plans"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const { priceId } = (await request.json().catch(() => ({}))) as { priceId?: string }
  const plan = planByPriceId(priceId)
  if (!plan || !plan.stripePriceId) {
    return NextResponse.json({ error: "Piano non acquistabile. Configura gli Stripe Price ID." }, { status: 400 })
  }

  const supabase = createClient()

  let customerId: string
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (existing?.stripe_customer_id) {
    customerId = existing.stripe_customer_id
  } else {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: user.id },
    })
    customerId = customer.id
    await supabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        stripe_customer_id: customerId,
        plan: plan.id,
        status: "pending",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
  }

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://getlivetrackerpro.com"

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    metadata: { userId: user.id, plan: plan.id, priceId: plan.stripePriceId },
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/pricing`,
  })

  return NextResponse.json({ url: session.url })
}
