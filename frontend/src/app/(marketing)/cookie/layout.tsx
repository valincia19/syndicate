import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Learn about how we use cookies and tracking technology to maintain secure login sessions and rate limits on our platform.",
}

export default function CookieLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
