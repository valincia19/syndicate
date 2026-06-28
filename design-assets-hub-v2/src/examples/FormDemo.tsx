import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"

export function FormDemo() {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Enter name" />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox id="terms" />
          <Label htmlFor="terms" className="text-sm cursor-pointer">Agree</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="dark" />
          <Label htmlFor="dark" className="text-sm cursor-pointer">Dark mode</Label>
        </div>
      </div>
      <RadioGroup defaultValue="light" className="flex gap-4">
        <div className="flex items-center gap-1.5">
          <RadioGroupItem value="light" id="r1" />
          <Label htmlFor="r1" className="text-sm cursor-pointer">Light</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <RadioGroupItem value="dark" id="r2" />
          <Label htmlFor="r2" className="text-sm cursor-pointer">Dark</Label>
        </div>
      </RadioGroup>
      <Button size="sm" className="w-full">Submit</Button>
    </div>
  )
}
