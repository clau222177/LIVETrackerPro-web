import { NextResponse } from "next/server"
import { planFromPriceId, stripe } from "@/lib/stripe"
import { serviceClient } from "@/lib/supabase/service"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) {
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 400 })
  }

  let event: import("stripe").Stripe.Event
  const body = await request.text()
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Firma non valida"
    return NextResponse.json({ error: `Webhook signature error: ${message}` }, { status: 400 })
  }

  const supabase = serviceClient()

  const upsert = async (payload: {
    user_id: string
    plan: string
    status: string
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
    current_period_end?: string | null
  }) => {
    await supabase.from("subscriptions").upsert(
      {
        user_id: payload.user_id,
        plan: payload.plan,
        status: payload.status,
        stripe_customer_id: payload.stripe_customer_id ?? null,
        stripe_subscription_id: payload.stripe_subscription_id ?? null,
        current_period_end: payload.current_period_end ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      const userId = session.metadata?.userId ?? session.client_reference_id
      const priceId =
        typeof session.subscription === "object" && session.subscription
          ? session.subscription.items?.data?.[0]?.price?.id
          : null
      if (userId) {
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id
        await upsert({
          user_id: userId,
          plan: planFromPriceId(priceId),
          status: "active",
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripe_subscription_id: subscriptionId ?? null,
          current_period_end: null,
        })
      }
      break
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id
      const { data: row } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle()

      if (row?.user_id) {
        const priceId = subscription.items.data[0]?.price?.id
        const cancelled =
          subscription.status === "canceled" ||
          subscription.status === "incomplete_expired" ||
          subscription.status === "unpaid"
        await upsert({
          user_id: row.user_id,
          plan: cancelled ? "free" : planFromPriceId(priceId),
          status: cancelled ? "cancelled" : subscription.status,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        })
      }
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id
      const { data: row } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle()
      if (row?.user_id) {
        await upsert({ user_id: row.user_id, plan: "free", status: "past_due" })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
