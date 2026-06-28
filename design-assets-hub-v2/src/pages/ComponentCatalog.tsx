import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"

import { AccordionDemo } from "../examples/AccordionDemo"
import { TabsDemo } from "../examples/TabsDemo"
import { DataTableDemo } from "../examples/DataTableDemo"
import { CommandDemo } from "../examples/CommandDemo"
import { DatePickerDemo } from "../examples/DatePickerDemo"
import { DialogDemo } from "../examples/DialogDemo"
import { DropdownMenuDemo } from "../examples/DropdownMenuDemo"
import { FormDemo } from "../examples/FormDemo"
import { BadgeDemo } from "../examples/BadgeDemo"
import { CardDemo } from "../examples/CardCompositeDemo"
import { TooltipDemo } from "../examples/TooltipDemo"
import { CarouselDemo } from "../examples/CarouselDemo"
import { ChartDemo } from "../examples/ChartDemo"
import { SheetDemo } from "../examples/SheetDemo"

export default function ComponentCatalog() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Design Assets Hub v2</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Complete ShadCN UI component catalog with Tailwind CSS v4.
            Each section demonstrates a component with real usage patterns.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => toast.success("Toast notification works!")}>
              Test Toast
            </Button>
            <Button variant="outline">Getting Started</Button>
          </div>
        </div>

        {/* Grid of Examples */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DemoCard title="Accordion">
            <AccordionDemo />
          </DemoCard>
          <DemoCard title="Tabs">
            <TabsDemo />
          </DemoCard>
          <DemoCard title="Data Table">
            <DataTableDemo />
          </DemoCard>
          <DemoCard title="Command Palette">
            <CommandDemo />
          </DemoCard>
          <DemoCard title="Date Picker">
            <DatePickerDemo />
          </DemoCard>
          <DemoCard title="Dialog">
            <DialogDemo />
          </DemoCard>
          <DemoCard title="Dropdown Menu">
            <DropdownMenuDemo />
          </DemoCard>
          <DemoCard title="Form Elements">
            <FormDemo />
          </DemoCard>
          <DemoCard title="Badges">
            <BadgeDemo />
          </DemoCard>
          <DemoCard title="Cards">
            <CardDemo />
          </DemoCard>
          <DemoCard title="Tooltips">
            <TooltipDemo />
          </DemoCard>
          <DemoCard title="Carousel">
            <CarouselDemo />
          </DemoCard>
          <DemoCard title="Charts">
            <ChartDemo />
          </DemoCard>
          <DemoCard title="Sheet / Drawer">
            <SheetDemo />
          </DemoCard>
        </div>

        <Toaster position="top-right" />
      </div>
    </div>
  )
}

function DemoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardDescription>Interactive demo</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
