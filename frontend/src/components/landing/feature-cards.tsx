"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { useLanguage } from "@/components/providers/language-provider"
import { ExecutionPreviewCard } from "@/components/landing/execution-preview-card"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FeatureCardProps {
  readonly title: string
  readonly description: string
  readonly isActive: boolean
  readonly progress: number
  readonly onClick: () => void
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const ROTATE_INTERVAL_MS = 5_000
const TICK_MS = 100
const PROGRESS_STEP = (TICK_MS / ROTATE_INTERVAL_MS) * 100 // 2%

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FeatureCards() {
  const { t } = useLanguage()
  
  const FEATURES = [
    {
      title: t("feat1Title"),
      description: t("feat1Desc"),
    },
    {
      title: t("feat2Title"),
      description: t("feat2Desc"),
    },
    {
      title: t("feat3Title"),
      description: t("feat3Desc"),
    },
  ]
  const cardCount = FEATURES.length
  const [activeCard, setActiveCard] = useState(0)
  const [progress, setProgress] = useState(0)
  // Handle progress bar increment
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => prev + PROGRESS_STEP)
    }, TICK_MS)

    return () => clearInterval(interval)
  }, [])

  // Handle active card switching when progress reaches 100%
  useEffect(() => {
    if (progress >= 100) {
      // Reset progress and switch card in a microtask to avoid cascading
      queueMicrotask(() => {
        setProgress(0)
        setActiveCard((prev) => (prev + 1) % cardCount)
      })
    }
  }, [progress, cardCount])

  const handleCardClick = useCallback(
    (index: number) => {
      setActiveCard(index)
      setProgress(0)
    },
    [],
  )

  return (
    <div id="features">
      <div className="pointer-events-none absolute top-60 left-1/2 -z-10 -translate-x-1/2 transform">
        <Image
          src="/ai-logo.png"
          alt="AI Logo"
          width={480}
          height={480}
          priority
          className="h-auto w-120 opacity-30"
        />
      </div>
      <div className="relative z-5 my-8 flex w-full flex-col items-center justify-center gap-2">
        <div className="flex h-[520px] w-full max-w-5xl flex-col items-start justify-start overflow-hidden rounded-md border shadow-2xl">
          <div className="flex flex-1 items-start justify-start self-stretch">
            <div className="flex h-full w-full items-center justify-center">
              <div className="relative h-full w-full overflow-hidden">
                <div
                  className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                    activeCard === 0
                      ? "blur-0 scale-100 opacity-100"
                      : "scale-95 opacity-0 blur-sm"
                  }`}
                >
                  <Image
                    src="/templates/ai-hero-black.webp"
                    alt="Bento Grid Dashboard"
                    width={1920}
                    height={1080}
                    priority
                    className="aspect-video h-full w-full object-cover"
                  />
                </div>

                <div
                  className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                    activeCard === 1
                      ? "blur-0 scale-100 opacity-100"
                      : "scale-95 opacity-0 blur-sm"
                  }`}
                >
                  <Image
                    src="/templates/ai-icons.jpg"
                    alt="Bento Grid Dashboard"
                    width={1920}
                    height={1080}
                    className="aspect-video h-full w-full object-cover"
                  />
                </div>

                <div
                  className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                    activeCard === 2
                      ? "blur-0 scale-100 opacity-100"
                      : "scale-95 opacity-0 blur-sm pointer-events-none"
                  }`}
                >
                  <ExecutionPreviewCard />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-10 flex items-start justify-center self-stretch border-y">
        {/* Left diagonal-line decoration */}
        <div className="relative w-4 self-stretch overflow-hidden sm:w-6 md:w-8 lg:w-12">
          <div className="absolute -top-30 -left-4 flex w-40 flex-col items-start justify-start">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="outline-primary/40 h-4 origin-top-left -rotate-45 self-stretch outline-[0.5px] outline-offset-[-0.25px]"
              />
            ))}
          </div>
        </div>

        {/* Feature cards */}
        <div className="flex flex-1 flex-col items-stretch justify-center gap-0 px-0 md:flex-row">
          {FEATURES.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              isActive={activeCard === index}
              progress={activeCard === index ? progress : 0}
              onClick={() => handleCardClick(index)}
            />
          ))}
        </div>

        {/* Right diagonal-line decoration */}
        <div className="relative w-4 self-stretch overflow-hidden sm:w-6 md:w-8 lg:w-12">
          <div className="absolute -top-30 -left-4 flex w-40 flex-col items-start justify-start">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="outline-primary/40 h-4 origin-top-left -rotate-45 self-stretch outline-[0.5px] outline-offset-[-0.25px]"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FeatureCard                                                        */
/* ------------------------------------------------------------------ */

function FeatureCard({
  title,
  description,
  isActive,
  progress,
  onClick,
}: FeatureCardProps) {
  return (
    <div
      className={`relative flex w-full cursor-pointer flex-col items-start justify-start gap-2 self-stretch overflow-hidden px-6 py-5 md:flex-1 ${
        isActive ? "bg-code border" : "border-r-0 border-l-0 md:border"
      }`}
      onClick={onClick}
    >
      {/* Progress bar */}
      {isActive && (
        <div className="absolute top-0 left-0 h-1 w-full">
          <div
            className="bg-primary h-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Text */}
      <div className="flex flex-col justify-center self-stretch text-sm font-semibold md:text-lg">
        {title}
      </div>
      <div className="text-muted-foreground self-stretch text-sm">
        {description}
      </div>
    </div>
  )
}
