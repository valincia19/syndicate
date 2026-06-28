"use client"

import { useSyncExternalStore } from "react"

interface ClientDateProps {
  date: string | Date
  format?: "date" | "time" | "datetime"
  locale?: string
  options?: Intl.DateTimeFormatOptions
  className?: string
}

const emptySubscribe = () => () => {}
const getSnapshot = () => true
const getServerSnapshot = () => false

export function ClientDate({
  date,
  format = "date",
  locale,
  options,
  className
}: ClientDateProps) {
  const isMounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot)

  if (!date) return <span className={className}>N/A</span>
  
  let dateStr = typeof date === 'string' ? date : date.toISOString()
  
  // Deteksi dan paksa format UTC jika backend (PostgreSQL) tidak mengirimkan 'Z'
  if (typeof date === 'string' && !dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:?\d{2}$/)) {
    dateStr = dateStr.replace(' ', 'T')
    if (!dateStr.endsWith('Z')) {
      dateStr += 'Z'
    }
  }
  
  const dateObj = new Date(dateStr)
  if (isNaN(dateObj.getTime())) return <span className={className}>Invalid Date</span>

  let formattedDate = ""

  try {
    if (options) {
      formattedDate = dateObj.toLocaleString(locale || undefined, options)
    } else {
      switch (format) {
        case "date":
          formattedDate = dateObj.toLocaleDateString(locale || undefined, { month: "short", day: "numeric", year: "numeric" })
          break
        case "time":
          formattedDate = dateObj.toLocaleTimeString(locale || undefined, { hour: "2-digit", minute: "2-digit" })
          break
        case "datetime":
          formattedDate = `${dateObj.toLocaleDateString(locale || undefined, { month: "short", day: "numeric" })} ${dateObj.toLocaleTimeString(locale || undefined, { hour: "2-digit", minute: "2-digit" })}`
          break
      }
    }
  } catch {
    formattedDate = "Error"
  }

  // Hindari Hydration mismatch dengan me-render setelah mounted di client
  if (!isMounted) {
    return <span className={className} suppressHydrationWarning></span>
  }

  return (
    <span className={className}>
      {formattedDate}
    </span>
  )
}
