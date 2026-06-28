"use client"

import Link from "next/link"
import { Header } from "@/components/layout/header"
import FooterSection from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Terminal, Home, Key, AlertTriangle } from "lucide-react"

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden">
      <div className="relative flex w-full flex-col items-center justify-start">
        <div className="relative flex min-h-screen w-full max-w-7xl flex-col items-start justify-start">
          {/* Side Border Lines */}
          <div className="bg-muted absolute top-0 left-4 z-0 h-full w-px sm:left-6 md:left-8 lg:left-0"></div>
          <div className="bg-muted absolute top-0 right-4 z-0 h-full w-px sm:right-6 md:right-8 lg:right-0"></div>

          <div className="relative z-10 flex flex-col items-center justify-between min-h-screen self-stretch overflow-hidden border-x border-border sm:gap-6 md:gap-8">
            {/* Decorative top pattern */}
            <div className="relative h-8 self-stretch overflow-hidden shrink-0">
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
                    ></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Header Navigation */}
            <Header />

            {/* Central 404 Hero Content */}
            <section className="relative flex flex-col items-center justify-center py-20 px-4 max-w-4xl mx-auto flex-1 gap-8 mt-16 md:mt-24">
              {/* Background ambient glow */}
              <div className="absolute -z-10 h-72 w-72 rounded-full bg-primary/10 blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>

              <div className="flex flex-col items-center gap-6 text-center">
                {/* Warning Hex Badge */}
                <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive animate-pulse">
                  <AlertTriangle className="h-7 w-7" />
                </div>

                <div className="space-y-2">
                  <h1 className="font-mono text-xs font-bold tracking-[0.3em] text-destructive uppercase">
                    Error Code: 404_PAGE_NOT_FOUND
                  </h1>
                  <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl font-outfit uppercase">
                    Lost in the Syndicate
                  </h2>
                  <p className="text-muted-foreground max-w-xl mx-auto text-center text-sm md:text-base leading-relaxed font-medium mt-3">
                    The virtual endpoint you are trying to query does not exist or has been garbage-collected by the server. Please verify your routing credentials.
                  </p>
                </div>
              </div>

              {/* Cyberpunk Terminal console mockup */}
              <div className="w-full max-w-md rounded-lg border border-border bg-card/60 backdrop-blur-md overflow-hidden shadow-2xl">
                <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider">Syndicate Routing Daemon</span>
                  </div>
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                </div>
                <div className="p-4 font-mono text-[10px] space-y-1 bg-background/90 text-zinc-400">
                  <div className="text-rose-400">{"[ERROR]"} HTTP-404: Virtual route resolved to nil</div>
                  <div>{"[TRACE]"} Thread terminated: route target unrecognized</div>
                  <div>{"[CACHE]"} Edge bypass: status direct (mismatch local)</div>
                  <div className="text-zinc-600">{"[SYSTEM]"} Awaiting operator routing action...</div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link href="/" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto font-mono text-xs tracking-wider uppercase">
                    <Home className="h-3.5 w-3.5 mr-1" /> Return to Base
                  </Button>
                </Link>
                <Link href="/portal/overview" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto font-mono text-xs tracking-wider uppercase">
                    <Key className="h-3.5 w-3.5 mr-1" /> Access Portal
                  </Button>
                </Link>
              </div>
            </section>

            {/* Footer Section */}
            <div className="w-full shrink-0">
              <FooterSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
