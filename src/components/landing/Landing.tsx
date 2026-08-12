"use client"

import Link from "next/link"
import { Crown, Play, CheckSquare, Calendar, BarChart3, Zap, ArrowRight, Euro } from "lucide-react"

const stats = [
  { value: "17.324,50 €", label: "Pool incentivi disponibile" },
  { value: "156,05 €", label: "Ricompensa max per video" },
  { value: "2", label: "Topic attivi" },
  { value: "5", label: "Punti checklist approvazione" },
]

const features = [
  {
    icon: <Euro size={20} />,
    title: "Dashboard ricompense",
    text: "Ricompense totali, video approvati e progresso del pool per ogni topic in tempo reale.",
  },
  {
    icon: <Play size={20} />,
    title: "Video Tracker",
    text: "Tieni traccia di ogni video con stato, argomento, link TikTok, visualizzazioni e guadagno.",
  },
  {
    icon: <CheckSquare size={20} />,
    title: "Checklist approvazione",
    text: "La checklist obbligatoria prima di pubblicare: mai più video rifiutati dal programma.",
  },
  {
    icon: <Calendar size={20} />,
    title: "Calendario post",
    text: "Pianifica la settimana: Lunedì Topic 1, Martedì Topic 2, con promemoria quotidiano.",
  },
  {
    icon: <BarChart3 size={20} />,
    title: "Statistiche",
    text: "Guadagni per giorno, settimana e mese con la stima di quanto resta nel pool.",
  },
  {
    icon: <Zap size={20} />,
    title: "Fatto per TikTok",
    text: "Design scuro, tono social e tutto in italiano, pronto per i creator del Programma LIVE.",
  },
]

export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />

      {/* NAV */}
      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
            <Crown size={18} className="text-white" />
          </span>
          <span>LIVE Tracker Pro</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-muted md:flex">
          <a href="#features" className="hover:text-white">Funzionalità</a>
          <Link href="/pricing" className="hover:text-white">Prezzi</Link>
          <Link href="/login" className="hover:text-white">Accedi</Link>
        </nav>
        <Link href="/login?signup=1" className="btn-brand !px-4 !py-2">
          Inizia gratis
        </Link>
      </header>

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-20 text-center md:pt-28">
        <span className="chip bg-brand/15 text-brand">Programma Incentivi TikTok LIVE</span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
          Massimizza le tue{" "}
          <span className="bg-gradient-to-r from-brand to-orange-400 bg-clip-text text-transparent">
            ricompense LIVE
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted md:text-lg">
          Traccia ogni video, rispetta la checklist di approvazione e guarda il pool del Programma Incentivi
          riempire il tuo saldo. Tutto in un unico posto.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/login?signup=1" className="btn-brand w-full sm:w-auto">
            Crea il tuo account <ArrowRight size={16} />
          </Link>
          <Link href="/pricing" className="btn-ghost w-full sm:w-auto">
            Vedi i piani
          </Link>
        </div>

        {/* Dashboard mock */}
        <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-line bg-surface p-6 text-left shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold text-white">Le tue ricompense totali</div>
            <span className="chip bg-brand/15 text-brand">Programma Incentivi</span>
          </div>
          <div className="text-4xl font-black text-white">0,00 €</div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface2 p-4">
              <div className="text-xs text-muted">Topic 1 · 156,05 € / video</div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
                <div className="h-full w-0 rounded-full bg-brand" />
              </div>
              <div className="mt-2 text-xs text-muted">Ancora 55 video · 0% del pool</div>
            </div>
            <div className="rounded-xl border border-line bg-surface2 p-4">
              <div className="text-xs text-muted">Topic 2 · 104,03 € / video</div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
                <div className="h-full w-0 rounded-full bg-brand" />
              </div>
              <div className="mt-2 text-xs text-muted">Ancora 83 video · 0% del pool</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-16">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-5 text-center">
              <div className="text-2xl font-black text-brand">{s.value}</div>
              <div className="mt-1 text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-4 pb-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">Tutto quello che serve al creator</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            La stessa app iOS, ora sul web. Stessa logica, stesso design, stessa efficacia.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-6 transition hover:border-brand/40">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand">
                {f.icon}
              </div>
              <h3 className="font-bold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-brand/10 p-10 text-center md:p-14">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/30 blur-[80px]" />
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">
            Inizia a guadagnare sul programma LIVE
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Crea un account gratis, traccia i primi 3 video e parti con la checklist perfetta.
          </p>
          <Link href="/login?signup=1" className="btn-brand mt-6">
            Crea il tuo account <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted md:flex-row">
          <div className="flex items-center gap-2 font-bold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand">
              <Crown size={14} className="text-white" />
            </span>
            LIVE Tracker Pro
          </div>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-white">Prezzi</Link>
            <Link href="/login" className="hover:text-white">Accedi</Link>
            <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
          </div>
          <div>© {new Date().getFullYear()} LIVE Tracker Pro</div>
        </div>
      </footer>
    </div>
  )
}
