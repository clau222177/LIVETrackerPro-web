// Hybrid scam-keyword block (@vellaclau)
// Pure logic shared by BOTH the server (API write-block + read-filter in getVideos)
// and the client (render-time hide in Tracker). Nothing here touches TikTok:
// blocked videos are ONLY hidden from LIVE Tracker Pro — the creator sets them
// to "Solo io" (Only Me) manually on TikTok so the account avoids algorithm penalty.

export const BLOCKED_KEYWORDS: string[] = [
  // Famiglia scam "free vault trick" (il "vault" / salvadanaio gratuito su TikTok)
  "free vault",
  "vault trick",
  "free vault trick",
  "money vault",
  "free money vault",
  // Marcatori scam generici collegati
  "money glitch",
  "cash glitch",
  "free money hack",
  "scam",
]

export type BlockedFields = {
  titolo?: string
  note?: string
  linkTikTok?: string
}

export type BlockMatch = {
  keyword: string
  field: keyof BlockedFields
  value: string
}

const FIELDS: (keyof BlockedFields)[] = ["titolo", "note", "linkTikTok"]

// Lowercase + senza accenti (così "và" matcha "va"): matching case-insensitive.
export function normalizeKeyword(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function findBlockMatch(
  video: BlockedFields,
  keywords: string[] = BLOCKED_KEYWORDS
): BlockMatch | null {
  for (const field of FIELDS) {
    const value = video[field]?.trim()
    if (!value) continue
    const haystack = normalizeKeyword(value)
    for (const keyword of keywords) {
      const needle = normalizeKeyword(keyword)
      if (needle && haystack.includes(needle)) {
        return { keyword, field, value }
      }
    }
  }
  return null
}

export function isScamVideo(video: BlockedFields, keywords?: string[]): boolean {
  return findBlockMatch(video, keywords) !== null
}

// Filtro di lettura: rimuove i video bloccati prima che arrivino all'UI.
export function hideScamVideos<V extends BlockedFields>(
  videos: V[],
  keywords?: string[]
): V[] {
  return videos.filter((v) => !isScamVideo(v, keywords))
}
