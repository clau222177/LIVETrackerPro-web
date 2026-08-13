import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { serviceClient } from "@/lib/supabase/service"

export const dynamic = "force-dynamic"

type CustomerRef = string | { id: string } | null

type CheckoutSession = {
  id: string
  customer: CustomerRef
  customer_email?: string | null
  customer_details?: { email?: string | null } | null
  metadata?: Record<string, string> | null
  client_reference_id?: string | null
  subscription?: string | { id: string } | null
}

type Invoice = {
  customer: CustomerRef
  customer_email?: string | null
  customer_details?: { email?: string | null } | null
  metadata?: Record<string, string> | null
  subscription?: string | { id: string } | null
  lines?: {
    data?: {
      price?: { id?: string | null } | null
      plan?: { id?: string | null } | null
      amount?: number | null
    }[]
  } | null
}

function planFromPriceId(priceId: string | null | undefined): "base" | "pro" {
  return priceId && process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO && priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
    ? "pro"
    : "base"
}

function customerIdOf(value: CustomerRef): string | null {
  if (!value) return null
  return typeof value === "string" ? value : value.id
}

async function retrieveInvoicePriceId(subscriptionRef: Invoice["subscription"]): Promise<string | null> {
  const subId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id
  if (!subId) return null
  try {
    const sub = await stripe.subscriptions.retrieve(subId)
    return sub.items.data[0]?.price?.id ?? null
  } catch (err) {
    console.log("[stripe-webhook] retrieveInvoicePriceId error:", err instanceof Error ? err.message : err)
    return null
  }
}

async function planFromInvoice(invoice: Invoice): Promise<"base" | "pro"> {
  const meta = invoice.metadata?.plan
  if (meta === "pro" || meta === "base") {
    console.log("[stripe-webhook] plan from invoice.metadata.plan:", meta)
    return meta
  }

  const priceId =
    invoice.lines?.data?.[0]?.price?.id ??
    invoice.lines?.data?.[0]?.plan?.id ??
    null
  const resolvedPriceId = priceId ?? (await retrieveInvoicePriceId(invoice.subscription))
  if (resolvedPriceId) {
    console.log("[stripe-webhook] plan from priceId:", resolvedPriceId)
    return planFromPriceId(resolvedPriceId)
  }

  const amount = invoice.lines?.data?.[0]?.amount
  if (amount === 999) {
    console.log("[stripe-webhook] plan from amount 999 -> base")
    return "base"
  }
  if (amount === 1999) {
    console.log("[stripe-webhook] plan from amount 1999 -> pro")
    return "pro"
  }

  console.log("[stripe-webhook] WARNING: no price/amount found on invoice, defaulting to base")
  return "base"
}

async function resolveAuthUserId(
  supabase: Awaited<ReturnType<typeof serviceClient>>,
  email: string | null | undefined,
  customerId: string | null | undefined
): Promise<string | null> {
  if (email) {
    try {
      const { data } = await supabase
        .schema("auth")
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle()
      if (data?.id) {
        console.log("[stripe-webhook] resolved auth.users id by email:", data.id)
        return data.id as string
      }
    } catch (err) {
      console.log("[stripe-webhook] auth.users lookup unavailable:", err instanceof Error ? err.message : err)
    }

    try {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle()
      if (data?.id) {
        console.log("[stripe-webhook] resolved profiles.id by email:", data.id)
        return data.id as string
      }
    } catch {
      // tabella profilo non presente -> fallback sotto
    }
  }

  if (customerId) {
    try {
      const { data } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle()
      if (data?.user_id) {
        console.log("[stripe-webhook] resolved user_id from subscriptions by customerId:", customerId)
        return data.user_id as string
      }
    } catch {
      // ignora
    }
  }

  console.log("[stripe-webhook] could not resolve auth user id for email:", email ?? "(none)")
  return null
}

async function upsertSubscription(
  supabase: Awaited<ReturnType<typeof serviceClient>>,
  payload: Record<string, unknown>
): Promise<void> {
  let res = await supabase.from("subscriptions").upsert(payload, { onConflict: "user_id" })
  if (res.error?.code === "PGRST204" && "plan" in payload) {
    const { plan: _p, ...withoutPlan } = payload
    void _p
    withoutPlan.plan_type = payload.plan
    res = await supabase.from("subscriptions").upsert(withoutPlan, { onConflict: "user_id" })
  }
  if (res.error) {
    console.log("[stripe-webhook] subscriptions upsert error:", res.error.code, res.error.message)
    if (res.error.code === "PGRST205") {
      console.log("[stripe-webhook] subscriptions table missing — RUN supabase/migrations/00001_init.sql in production Supabase")
    }
  } else {
    console.log("[stripe-webhook] subscriptions upsert ok")
  }
}

async function setPremium(payload: {
  userId?: string | null
  email?: string | null
  plan: "base" | "pro"
  customerId?: string | null
}): Promise<void> {
  const supabase = serviceClient()
  const { userId: metadataUserId, email, plan, customerId } = payload
  const now = new Date().toISOString()

  const userId = metadataUserId ?? (await resolveAuthUserId(supabase, email, customerId))
  console.log("[stripe-webhook] Updating Supabase for email:", email ?? "(none)", "with plan:", plan, "| resolved userId:", userId ?? "(none)", "| customerId:", customerId ?? "(none)")

  if (userId) {
    await upsertSubscription(supabase, {
      user_id: userId,
      plan,
      status: "active",
      stripe_customer_id: customerId ?? null,
      updated_at: now,
    })

    const profilesPayload: Record<string, unknown> = {
      id: userId,
      plan_type: plan,
      is_premium: true,
      updated_at: now,
    }
    if (email) profilesPayload.email = email
    if (customerId) profilesPayload.stripe_customer_id = customerId

    let profRes = await supabase.from("profiles").upsert(profilesPayload, { onConflict: "id" })
    if (profRes.error?.code === "PGRST204") {
      const { stripe_customer_id: _omit, ...minimal } = profilesPayload
      void _omit
      profRes = await supabase.from("profiles").upsert(minimal, { onConflict: "id" })
    }
    if (profRes.error) {
      console.log("[stripe-webhook] profiles upsert error:", profRes.error.code, profRes.error.message)
      if (profRes.error.code === "PGRST204") {
        console.log("[stripe-webhook] missing columns on profiles — RUN supabase/migrations/00002_stripe_live.sql in production Supabase")
      }
      if (profRes.error.code === "PGRST205") {
        console.log("[stripe-webhook] profiles table missing — RUN supabase/migrations/00001_init.sql in production Supabase")
        const userRes = await supabase.from("users").upsert(profilesPayload, { onConflict: "id" })
        if (userRes.error) console.log("[stripe-webhook] users upsert error:", userRes.error.code, userRes.error.message)
        else console.log("[stripe-webhook] users upsert ok")
      }
    } else {
      console.log("[stripe-webhook] profiles upsert ok")
    }
  } else {
    const fallback = await supabase
      .from("profiles")
      .update({ plan_type: plan, is_premium: true, stripe_customer_id: customerId ?? null, updated_at: now })
      .eq("email", email ?? "")
    if (fallback.error) {
      console.log("[stripe-webhook] profiles update-by-email fallback error:", fallback.error.code, fallback.error.message)
    } else {
      console.log("[stripe-webhook] profiles update-by-email fallback ok")
    }
  }
}

export async function POST(request: Request) {
  console.log("[stripe-webhook] env check — SUPABASE_SERVICE_ROLE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    "| SUPABASE_SERVICE_KEY:", !!process.env.SUPABASE_SERVICE_KEY,
    "| NEXT_PUBLIC_SUPABASE_URL:", !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    "| STRIPE_WEBHOOK_SECRET:", !!process.env.STRIPE_WEBHOOK_SECRET,
    "| NEXT_PUBLIC_STRIPE_PRICE_PRO:", !!process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
    "| NEXT_PUBLIC_STRIPE_PRICE_BASE:", !!process.env.NEXT_PUBLIC_STRIPE_PRICE_BASE)

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
      const session = event.data.object as CheckoutSession
      const userId = session.metadata?.userId ?? session.client_reference_id ?? null
      const email = session.customer_details?.email || session.customer_email || session.metadata?.email || null
      const customerId = customerIdOf(session.customer)
      let plan: "base" | "pro"
      if (session.metadata?.plan === "pro" || session.metadata?.plan === "base") {
        plan = session.metadata.plan
      } else {
        const priceId = session.metadata?.priceId ?? null
        plan = planFromPriceId(priceId)
      }
      console.log("[stripe-webhook] checkout.session.completed — email:", email, "| metadata.plan:", session.metadata?.plan, "| customerId:", customerId)
      await setPremium({ userId, email, plan, customerId })
      break
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Invoice
      let email = invoice.customer_email || invoice.customer_details?.email || null
      if (!email && typeof invoice.customer === "string") {
        try {
          const cust = await stripe.customers.retrieve(invoice.customer)
          if (!("deleted" in cust)) email = cust.email ?? null
        } catch (err) {
          console.log("[stripe-webhook] customer retrieve error:", err instanceof Error ? err.message : err)
        }
      }
      const customerId = customerIdOf(invoice.customer)
      const plan = await planFromInvoice(invoice)
      console.log("[stripe-webhook] invoice.payment_succeeded — email:", email, "| plan:", plan, "| customerId:", customerId)
      await setPremium({ email, plan, customerId })
      break
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as {
        id: string
        customer: CustomerRef
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
        await upsertSubscription(supabase, {
          user_id: row.user_id,
          plan: cancelled ? "free" : planFromPriceId(priceId),
          status: cancelled ? "cancelled" : subscription.status,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
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
      const invoice = event.data.object as { customer: CustomerRef }
      const customerId = customerIdOf(invoice.customer)
      const { data: row } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId ?? "")
        .maybeSingle()
      if (row?.user_id) {
        await upsertSubscription(supabase, {
          user_id: row.user_id,
          plan: "free",
          status: "past_due",
          updated_at: new Date().toISOString(),
        })
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
