import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Changelog",
  description: "Track real-time releases, updates, security improvements, and bug fixes for the VALINC SYNDICATE script hub and execution engine.",
}

export default function ChangelogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
