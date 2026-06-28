"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useLanguage } from "@/components/providers/language-provider"

export default function FAQSection() {
  const { t } = useLanguage()

  const faqData = [
    {
      question: t("faq1Q"),
      answer: t("faq1A"),
    },
    {
      question: t("faq2Q"),
      answer: t("faq2A"),
    },
    {
      question: t("faq3Q"),
      answer: t("faq3A"),
    },
    {
      question: t("faq4Q"),
      answer: t("faq4A"),
    },
    {
      question: t("faq5Q"),
      answer: t("faq5A"),
    },
    {
      question: t("faq6Q"),
      answer: t("faq6A"),
    },
  ]

  return (
    <div className="flex w-full items-start justify-center">
      <div className="flex flex-1 flex-col gap-6 px-4 py-16 md:px-12 md:py-20 lg:flex-row lg:gap-12">
        <div className="flex w-full flex-col gap-4 lg:flex-1 lg:py-5">
          <h2 className="text-4xl leading-tight font-semibold tracking-tight">
            {t("faqTitle")}
          </h2>
          <p className="text-muted-foreground text-base leading-7">
            {t("faqDesc")}
          </p>
        </div>

        <div className="w-full lg:flex-1">
          <Accordion type="single" className="w-full">
            {faqData.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-b"
              >
                <AccordionTrigger className="p-5 text-left text-base font-medium hover:no-underline">
                  {item.question}
                </AccordionTrigger>

                <AccordionContent className="p-5 text-sm leading-6">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  )
}
