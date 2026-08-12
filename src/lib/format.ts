export function eur(n: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short" }).format(new Date(iso))
}

export function fullDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(new Date(iso))
}

export function monthYear(date: Date): string {
  const s = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(date)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function dateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
