import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { PanelRightOpen } from "lucide-react"

export function SheetDemo() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <PanelRightOpen className="mr-2 size-4" /> Open Panel
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Details Panel</SheetTitle>
          <SheetDescription>
            Slide-in panel for secondary actions and contextual information.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border p-4">
            <h4 className="text-sm font-medium">Design Status</h4>
            <p className="text-xs text-muted-foreground mt-1">All 30+ components ready for use.</p>
          </div>
          <div className="rounded-lg border p-4">
            <h4 className="text-sm font-medium">Theme</h4>
            <p className="text-xs text-muted-foreground mt-1">OKLCH colors with dark mode support.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
