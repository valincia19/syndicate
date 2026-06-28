import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function TabsDemo() {
  return (
    <Tabs defaultValue="design" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="design" className="flex-1">Design</TabsTrigger>
        <TabsTrigger value="code" className="flex-1">Code</TabsTrigger>
        <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="design" className="text-sm text-muted-foreground pt-2">
        Design system uses OKLCH colors with a neutral base palette.
      </TabsContent>
      <TabsContent value="code" className="text-sm text-muted-foreground pt-2">
        Components built with Radix UI primitives and Tailwind CSS v4.
      </TabsContent>
      <TabsContent value="preview" className="text-sm text-muted-foreground pt-2">
        Real-time preview with HMR via Vite 8.
      </TabsContent>
    </Tabs>
  )
}
