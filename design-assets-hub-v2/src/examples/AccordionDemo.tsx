import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function AccordionDemo() {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>Design Tokens</AccordionTrigger>
        <AccordionContent>
          All colors, typography, and spacing tokens are defined in CSS custom properties using OKLCH color space.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Components</AccordionTrigger>
        <AccordionContent>
          30+ ShadCN UI components available with dark mode support and responsive design.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Icons</AccordionTrigger>
        <AccordionContent>
          Powered by Lucide React with tree-shaking for optimal bundle size.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
