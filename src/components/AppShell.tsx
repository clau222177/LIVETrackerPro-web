"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Crown, Menu, X } from "lucide-react"
import { useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

export function AppShell({ email, planLabel, children }: { email: string; planLabel: string; children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/tracker", label: "Video" },
    { href: "/pricing", label: "Prezzi" },
    { href: "/account", label: "Account" },
  ]

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
              <Crown size={18} className="text-white" />
            </span>
            <span className="text-white">LIVE Tracker Pro</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  pathname.startsWith(link.href) ? "bg-white/10 text-white" : "text-muted hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <span className="chip bg-brand/15 text-brand">{planLabel}</span>
            <span className="hidden text-sm text-muted lg:inline">{email}</span>
            <button onClick={handleLogout} className="btn-ghost !py-1.5">
              Esci
            </button>
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-2 text-white md:hidden"
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-line bg-ink px-4 py-3 md:hidden">
            <div className="mb-3 flex items-center justify-between">
              <span className="chip bg-brand/15 text-brand">{planLabel}</span>
              <span className="text-xs text-muted">{email}</span>
            </div>
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-white/10"
              >
                Esci
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
