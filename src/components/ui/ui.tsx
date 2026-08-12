"use client"

import { X } from "lucide-react"
import type { ReactNode } from "react"

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.min(Math.max(value, 0), 1) * 100
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-line ${className}`}>
      <div
        className="h-full rounded-full bg-brand transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function StatBox({
  value,
  label,
  color = "text-white",
}: {
  value: string
  label: string
  color?: string
}) {
  return (
    <div className="card flex flex-1 flex-col items-center justify-center gap-1.5 px-4 py-5 text-center">
      <div className={`text-xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}

export function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="chip"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      {children}
    </span>
  )
}

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="text-lg font-bold text-white">{title}</div>
      <div className="max-w-xs text-sm text-muted">{subtitle}</div>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:py-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "success" | "info"; children: ReactNode }) {
  const styles = {
    danger: "border-danger/40 bg-danger/10 text-danger",
    success: "border-success/40 bg-success/10 text-success",
    info: "border-info/40 bg-info/10 text-info",
  }[tone]
  return <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${styles}`}>{children}</div>
}
