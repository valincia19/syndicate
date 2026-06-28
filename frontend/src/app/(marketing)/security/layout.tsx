import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Security Architecture",
  description: "Discover our multi-layered defense architecture: bytecode obfuscation, PostgreSQL connection pooling, and Upstash Redis rate limits.",
}

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
