import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  return NextResponse.redirect(`${base}/dashboard?confirmed=1`)
}
