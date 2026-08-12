import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { Account } from "@/components/account/Account"
import { getUser, getSubscription } from "@/lib/data"

export const metadata: Metadata = { title: "Account" }

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const user = await getUser()
  if (!user) redirect("/login")

  const subscription = await getSubscription(user.id)
  const planId = subscription?.plan ?? "free"
  const status = subscription?.status ?? "inactive"
  const periodEnd = subscription?.current_period_end ?? null
  const isSubscribed = status === "active" && planId !== "free"

  return (
    <Account
      email={user.email ?? ""}
      planId={planId}
      status={status}
      periodEnd={periodEnd}
      isSubscribed={isSubscribed}
    />
  )
}
