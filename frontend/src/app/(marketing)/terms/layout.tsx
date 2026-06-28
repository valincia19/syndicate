import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Review the official terms of service, license restrictions, and user agreements for accessing the VALINC SYNDICATE scripting platform.",
}

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
