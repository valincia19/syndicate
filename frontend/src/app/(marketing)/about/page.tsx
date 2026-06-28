/**
 * About Page - VALINC SYNDICATE
 * ───────────────────────────────────────────────────────────────
 * Uses the aliimam about-01 shadcn template components, adapted to
 * VALINC SYNDICATE branding and i18n. Sits inside the same landing
 * page shell (max-w-7xl, side rails, top pattern) as the home page.
 *
 * Components used:
 *   Me       - Hero intro with team avatars + project identity card
 *   Journey  - Timeline of milestones from 2022 to 2026
 *   CTA      - Call to action (back to home / get started)
 *   Connect  - Platform links (Discord, docs)
 */

import type { Metadata } from "next"
import { Me } from "@/components/me"
import { Journey } from "@/components/journey"
import { CTA } from "@/components/create"
import { Connect } from "@/components/connect"
import { Header } from "@/components/layout/header"
import CTASection from "@/components/landing/cta-section"
import FooterSection from "@/components/layout/footer"

export const metadata: Metadata = {
  title: "About Us",
  description: "Meet the team and trace the history and milestones of VALINC SYNDICATE, the ultimate next-gen Roblox scripting engine.",
}

export default function AboutPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden">
      <div className="relative flex w-full flex-col items-center justify-start">
        <div className="relative flex min-h-screen w-full max-w-7xl flex-col items-start justify-start">
          {/* Side rails */}
          <div className="bg-muted absolute top-0 left-4 z-0 h-full w-px sm:left-6 md:left-8 lg:left-0"></div>
          <div className="bg-muted absolute top-0 right-4 z-0 h-full w-px sm:right-6 md:right-8 lg:right-0"></div>

          <div className="relative z-10 flex flex-col items-center justify-center gap-4 self-stretch overflow-hidden border-x sm:gap-6 md:gap-8">
            {/* Decorative top pattern - same as landing */}
            <div className="relative h-8 self-stretch overflow-hidden">
              <div className="absolute inset-0 h-full w-full overflow-hidden">
                <div className="relative h-full w-full">
                  {Array.from({ length: 300 }).map((_, i) => (
                    <div
                      key={i}
                      className="outline-primary/40 absolute h-4 w-full origin-top-left -rotate-45 outline-[0.5px] outline-offset-[-0.25px]"
                      style={{
                        top: `${i * 16 - 120}px`,
                        left: "-100%",
                        width: "300%",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <Header />

            <Me />
            <Journey />
            <CTA />
            <Connect />

            <CTASection />
            <FooterSection />
          </div>
        </div>
      </div>
    </div>
  )
}
