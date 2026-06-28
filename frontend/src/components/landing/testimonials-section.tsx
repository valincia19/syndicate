"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"

export default function TestimonialsSection() {
  const { t } = useLanguage()
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const testimonials = [
    {
      quote: t("testi1Quote"),
      name: t("testi1Author"),
      company: t("testi1Role"),
      image: "https://cdn.vinzhub.com/images/Feedback/37a9907239dfc21aa35b130db469734d.png",
    },
    {
      quote: t("testi2Quote"),
      name: t("testi2Author"),
      company: t("testi2Role"),
      image: "https://cdn.vinzhub.com/images/Feedback/a_50c761c670f80578057818a4f04fa10a.gif",
    },
    {
      quote: t("testi3Quote"),
      name: t("testi3Author"),
      company: t("testi3Role"),
      image: "https://cdn.vinzhub.com/images/Feedback/45c366874521af52f716e1d7509c7332.png",
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
        setTimeout(() => {
          setIsTransitioning(false)
        }, 100)
      }, 300)
    }, 12000)

    return () => clearInterval(interval)
  }, [testimonials.length])

  const handleNavigationClick = (index: number) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setActiveTestimonial(index)
      setTimeout(() => {
        setIsTransitioning(false)
      }, 100)
    }, 300)
  }

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <div className="flex items-center justify-center gap-6 self-stretch px-4 py-8 sm:px-6 md:px-24 md:py-16">
        <div className="flex w-full max-w-4xl flex-col items-center justify-start gap-3 overflow-hidden">
          <Badge variant={"secondary"}>{t("testiBadge")}</Badge>
          <div className="flex w-full max-w-xl flex-col justify-center text-center text-xl leading-tight font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-5xl">
            {t("testiTitle")}
          </div>
          <div className="text-muted-foreground self-stretch text-center text-sm leading-6">
            {t("testiDesc")}
          </div>
        </div>
      </div>

      <div className="bg-background flex items-center justify-start self-stretch overflow-hidden border border-t-0 border-r-0 border-b border-l-0 px-2">
        <div className="flex flex-1 flex-col items-end justify-center gap-6 py-16 md:flex-row md:py-17">
          <div className="flex flex-col items-start justify-center gap-4 self-stretch px-3 md:flex-row md:px-12">
            <Image
              className="h-50 w-48 rounded-lg object-cover transition-all duration-700 ease-in-out md:h-50 md:w-48"
              style={{
                opacity: isTransitioning ? 0.6 : 1,
                transform: isTransitioning ? "scale(0.95)" : "scale(1)",
                transition:
                  "opacity 0.7s ease-in-out, transform 0.7s ease-in-out",
              }}
              src={testimonials[activeTestimonial].image || "/placeholder.svg"}
              alt={testimonials[activeTestimonial].name}
              width={192}
              height={200}
            />
            <div className="flex flex-1 flex-col items-start justify-start gap-3 overflow-hidden px-6">
              <div
                className="line-clamp-5 flex h-40 flex-col justify-start self-stretch overflow-hidden text-4xl font-medium tracking-tight transition-all duration-700 ease-in-out"
                style={{
                  filter: isTransitioning ? "blur(4px)" : "blur(0px)",
                  transition: "filter 0.7s ease-in-out",
                }}
              >
                {testimonials[activeTestimonial].quote}
              </div>
              <div
                className="flex items-start justify-start gap-1 self-stretch transition-all duration-700 ease-in-out"
                style={{
                  filter: isTransitioning ? "blur(4px)" : "blur(0px)",
                  transition: "filter 0.7s ease-in-out",
                }}
              >
                <div className="flex flex-col justify-center self-stretch text-lg font-medium">
                  {testimonials[activeTestimonial].name} -
                </div>
                <div className="text-muted-foreground flex flex-col justify-center self-stretch text-lg font-medium">
                  {testimonials[activeTestimonial].company}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start justify-start gap-3 pr-6">
            <Button
              size={"icon"}
              variant={"outline"}
              onClick={() =>
                handleNavigationClick(
                  (activeTestimonial - 1 + testimonials.length) %
                    testimonials.length
                )
              }
            >
              <ChevronLeft />
            </Button>
            <Button
              size={"icon"}
              variant={"outline"}
              onClick={() =>
                handleNavigationClick(
                  (activeTestimonial + 1) % testimonials.length
                )
              }
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      <div className="relative h-12 self-stretch overflow-hidden border-b">
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
    </div>
  )
}
