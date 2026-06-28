import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Calculator, CreditCard, Settings, Smile, User, Search } from "lucide-react"

export function CommandDemo() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <p className="text-sm text-muted-foreground mb-2">
        Press{" "}
        <kbd className="rounded border px-1.5 py-0.5 text-xs bg-muted">Ctrl+K</kbd>
      </p>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-between"
        onClick={() => setOpen(true)}
      >
        <span className="inline-flex items-center gap-2">
          <Search className="size-4" /> Quick search...
        </span>
        <CommandShortcut className="hidden sm:block">⌘K</CommandShortcut>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 [&>[data-slot=dialog-close]]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Command Menu</DialogTitle>
          </DialogHeader>
          <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-item]_svg]:size-4">
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem onSelect={() => setOpen(false)}>
                  <Calculator /> Calculator
                </CommandItem>
                <CommandItem onSelect={() => setOpen(false)}>
                  <User /> Profile
                </CommandItem>
                <CommandItem onSelect={() => setOpen(false)}>
                  <CreditCard /> Billing
                </CommandItem>
                <CommandItem onSelect={() => setOpen(false)}>
                  <Settings /> Settings
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Pages">
                <CommandItem onSelect={() => setOpen(false)}>
                  <Smile /> Dashboard
                </CommandItem>
                <CommandItem onSelect={() => setOpen(false)}>
                  <Search /> Search
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}

