import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Support & Contact",
  description: "Get in touch with the VALINC SYNDICATE support staff, developers, or join our community Discord server for instant assistance.",
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
