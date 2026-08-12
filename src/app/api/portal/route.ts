import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/data"
import { stripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const supabase = createClient()
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!data?.stripe_customer_id) {
    return NextResponse.json({ error: "Nessun cliente Stripe associato." }, { status: 400 })
  }

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"

  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${origin}/account`,
  })

  return NextResponse.json({ url: session.url })
}
