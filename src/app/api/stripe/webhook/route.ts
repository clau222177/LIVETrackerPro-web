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
  } catch (err) {
    console.log("[stripe-webhook] checkoutPriceId error:", err instanceof Error ? err.message : err)
    return null
  }
}

async function customerEmail(customer: string | { id: string } | null | undefined): Promise<string | null> {
  const id = customerIdOf(customer)
  if (!id) return null
  try {
    const cust = await stripe.customers.retrieve(id)
    if (!("deleted" in cust)) return cust.email ?? null
  } catch (err) {
    console.log("[stripe-webhook] customerEmail error:", err instanceof Error ? err.message : err)
  }
  return null
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
  console.log("[stripe-webhook] Updating Supabase for email:", email ?? "(none)", "with plan:", plan, "userId:", userId ?? "(none)", "customerId:", customerId ?? "(none)")

  if (userId) {
    const res = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan,
          status: "active",
          stripe_customer_id: customerId ?? null,
          updated_at: now,
        },
        { onConflict: "user_id" }
      )
    if (res.error) console.log("[stripe-webhook] subscriptions upsert error:", res.error.code, res.error.message)
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
    if (res.error) {
      console.log(`[stripe-webhook] ${table} update error:`, res.error.code, res.error.message)
    } else {
      console.log(`[stripe-webhook] ${table} update ok, rows matched:`, res.count ?? "n/a")
    }
    if (res.error?.code === "PGRST205" && table === "profiles") {
      await tryTable("users")
    }
  }

  if (email) {
    await tryTable("profiles")
  } else if (userId) {
    let res = await supabase.from("profiles").update(profilesPayload).eq("id", userId)
    if (res.error) {
      console.log("[stripe-webhook] profiles update (by id) error:", res.error.code, res.error.message)
      if (res.error?.code === "PGRST205") {
        const r2 = await supabase.from("users").update(profilesPayload).eq("id", userId)
        if (r2.error) console.log("[stripe-webhook] users update (by id) error:", r2.error.code, r2.error.message)
      }
    }
  }
}

export async function POST(request: Request) {
  console.log("[stripe-webhook] env check — SUPABASE_SERVICE_ROLE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    "| SUPABASE_SERVICE_KEY:", !!process.env.SUPABASE_SERVICE_KEY,
    "| NEXT_PUBLIC_SUPABASE_URL:", !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    "| STRIPE_WEBHOOK_SECRET:", !!process.env.STRIPE_WEBHOOK_SECRET,
    "| NEXT_PUBLIC_STRIPE_PRICE_PRO:", !!process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO)

  const sig = request.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) {
    console.log("[stripe-webhook] missing stripe-signature or STRIPE_WEBHOOK_SECRET")
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 400 })
  }

  const body = await request.text()
  let event: import("stripe").Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Firma non valida"
    console.log("[stripe-webhook] signature error:", message)
    return NextResponse.json({ error: `Webhook signature error: ${message}` }, { status: 400 })
  }

  console.log("[stripe-webhook] event.type:", event.type)
  console.log("[stripe-webhook] event keys:", Object.keys(event.data.object))

  const supabase = serviceClient()

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as SessionData
      const userId = session.metadata?.userId ?? session.client_reference_id ?? null
      const email = session.customer_details?.email || session.customer_email || session.metadata?.email || null
      const customerId = customerIdOf(session.customer)
      let plan: "base" | "pro"
      let priceId: string | null = null
      if (session.metadata?.plan === "pro" || session.metadata?.plan === "base") {
        plan = session.metadata.plan
      } else {
        priceId = session.metadata?.priceId ?? (await checkoutPriceId(session.id))
        plan = planFromPriceId(priceId)
      }
      console.log("[stripe-webhook] checkout.session.completed — email:", email, "| priceId:", priceId, "| metadata.plan:", session.metadata?.plan, "| customerId:", customerId)
      await setPremium({ userId, email, plan, customerId })
      break
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as {
        customer: string | { id: string } | null
        customer_email?: string | null
        customer_details?: { email?: string | null } | null
        metadata?: Record<string, string> | null
        lines?: { data?: { price?: { id: string } | null; plan?: { id?: string } | null }[] }
      }
      let email = invoice.customer_email || invoice.customer_details?.email || null
      if (!email) {
        email = await customerEmail(invoice.customer)
      }
      const priceId = invoice.lines?.data?.[0]?.price?.id ?? invoice.lines?.data?.[0]?.plan?.id ?? null
      const customerId = customerIdOf(invoice.customer)
      const plan = planFromPriceId(priceId)
      console.log("[stripe-webhook] invoice.payment_succeeded — email:", email, "| priceId:", priceId, "| customerId:", customerId)
      await setPremium({ email, plan, customerId })
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
      console.log("[stripe-webhook] subscription event — status:", subscription.status, "| customerId:", customerId)
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
        const res = await supabase
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
        if (res.error) console.log("[stripe-webhook] subscriptions upsert error:", res.error.code, res.error.message)
        const pres = await supabase
          .from("profiles")
          .update({ is_premium: !cancelled, plan_type: cancelled ? "free" : planFromPriceId(priceId), updated_at: new Date().toISOString() })
          .eq("id", row.user_id)
        if (pres.error) console.log("[stripe-webhook] profiles update (sub) error:", pres.error.code, pres.error.message)
      } else {
        console.log("[stripe-webhook] subscription event: no matching subscriptions row for customerId:", customerId)
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

  console.log("[stripe-webhook] done — received:", event.type)
  return NextResponse.json({ received: true })
}
