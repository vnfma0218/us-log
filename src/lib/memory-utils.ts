export function toIsoDate(dateInput?: string | null) {
  if (!dateInput) return new Date()
  const parsed = new Date(dateInput)
  if (Number.isNaN(parsed.getTime())) return new Date()
  return parsed
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function buildAutoSummary({
  date,
  locationName,
  caption,
}: {
  date: Date
  locationName?: string | null
  caption?: string | null
}) {
  const dateText = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(date)
  const where = locationName?.trim() ? `${locationName}에서` : "함께"
  const captionText = caption?.trim() ? ` ${caption.trim()}` : ""
  return `${dateText} ${where} 남긴 추억.${captionText}`.trim()
}

export function buildMemoryTitle(date: Date) {
  const formatted = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(date)
  return `${formatted}의 기록`
}
