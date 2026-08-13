import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { serviceClient } from "@/lib/supabase/service"

export const dynamic = "force-dynamic"

type SessionData = {
  id: string
  customer: string | { id: string } | null
  customer_email?: string | null
  customer_details?: { email?: string | null } | null
  metadata?: Record<string, string> | null
  client_reference_id?: string | null
  subscription?: string | { id: string } | null
}

function planFromPriceId(priceId: string | null | undefined): "base" | "pro" {
  return priceId && process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO && priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
    ? "pro"
    : "base"
}

function customerIdOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === "string" ? value : value.id
}

async function checkoutPriceId(sessionId: string): Promise<string | null> {
  try {
    const sub = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] })
    return sub.line_items?.data?.[0]?.price?.id ?? null
  } catch {
    return null
  }
}

async function setPremium(payload: {
  userId?: string | null
  email?: string | null
  plan: "base" | "pro"
  customerId?: string | null
}): Promise<void> {
  const supabase = serviceClient()
  const { userId, email, plan, customerId } = payload
  const now = new Date().toISOString()

  if (userId) {
    await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        plan,
        status: "active",
        stripe_customer_id: customerId ?? null,
        updated_at: now,
      },
      { onConflict: "user_id" }
    )
  }

  const profilesPayload: Record<string, unknown> = {
    plan_type: plan,
    is_premium: true,
    updated_at: now,
  }
  if (customerId) profilesPayload.stripe_customer_id = customerId

  const tryTable = async (table: string) => {
    let res = await supabase.from(table).update(profilesPayload).eq("email", email ?? "")
    if (res.error?.code === "PGRST204") {
      const { stripe_customer_id: _omit, ...minimal } = profilesPayload
      void _omit
      res = await supabase.from(table).update(minimal).eq("email", email ?? "")
    }
    if (res.error?.code === "PGRST205" && table === "profiles") {
      await tryTable("users")
    }
  }

  try {
    if (email) {
      await tryTable("profiles")
    } else if (userId) {
      let res = await supabase.from("profiles").update(profilesPayload).eq("id", userId)
      if (res.error?.code === "PGRST205") {
        await supabase.from("users").update(profilesPayload).eq("id", userId)
      }
    }
  } catch {
    // non fatale: la verifica firma è già passata
  }
}

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) {
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 400 })
  }

  const body = await request.text()
  let event: import("stripe").Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Firma non valida"
    return NextResponse.json({ error: `Webhook signature error: ${message}` }, { status: 400 })
  }

  const supabase = serviceClient()

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as SessionData
      const userId = session.metadata?.userId ?? session.client_reference_id ?? null
      const email = session.customer_details?.email ?? session.customer_email ?? null
      const customerId = customerIdOf(session.customer)
      const priceId = await checkoutPriceId(session.id)
      const plan = session.metadata?.plan === "base" ? "base" : planFromPriceId(priceId)
      await setPremium({ userId, email, plan, customerId })
      break
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as {
        customer: string | { id: string } | null
        customer_email?: string | null
        customer_details?: { email?: string | null } | null
        lines?: { data?: { price?: { id: string } | null; plan?: { id?: string } | null }[] }
      }
      const email = invoice.customer_email ?? invoice.customer_details?.email ?? null
      const priceId = invoice.lines?.data?.[0]?.price?.id ?? invoice.lines?.data?.[0]?.plan?.id ?? null
      const customerId = customerIdOf(invoice.customer)
      await setPremium({ email, plan: planFromPriceId(priceId), customerId })
      break
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as {
        id: string
        customer: string | { id: string } | null
        status: string
        current_period_end?: number
        items?: { data?: { price?: { id?: string } | null }[] }
      }
      const customerId = customerIdOf(subscription.customer)
      const { data: row } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId ?? "")
        .maybeSingle()

      if (row?.user_id) {
        const cancelled =
          subscription.status === "canceled" ||
          subscription.status === "incomplete_expired" ||
          subscription.status === "unpaid"
        const priceId = subscription.items?.data?.[0]?.price?.id ?? null
        await supabase
          .from("subscriptions")
          .upsert(
            {
              user_id: row.user_id,
              plan: cancelled ? "free" : planFromPriceId(priceId),
              status: cancelled ? "cancelled" : subscription.status,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              current_period_end: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          )
        await supabase
          .from("profiles")
          .update({ is_premium: !cancelled, plan_type: cancelled ? "free" : planFromPriceId(priceId), updated_at: new Date().toISOString() })
          .eq("id", row.user_id)
      }
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as { customer: string | { id: string } | null }
      const customerId = customerIdOf(invoice.customer)
      const { data: row } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId ?? "")
        .maybeSingle()
      if (row?.user_id) {
        await supabase
          .from("subscriptions")
          .upsert(
            { user_id: row.user_id, plan: "free", status: "past_due", updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          )
        await supabase
          .from("profiles")
          .update({ is_premium: false, plan_type: "free", updated_at: new Date().toISOString() })
          .eq("id", row.user_id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
