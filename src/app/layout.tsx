import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "LIVE Tracker Pro",
    template: "%s · LIVE Tracker Pro",
  },
  description:
    "Il tracker per i creator TikTok del Programma Incentivi LIVE: ricompense, video, checklist approvazione e statistiche.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className="min-h-screen bg-ink text-white antialiased">{children}</body>
    </html>
  )
}
