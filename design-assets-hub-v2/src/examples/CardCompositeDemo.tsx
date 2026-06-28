import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function CardCompositeDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Project Overview</CardTitle>
        <CardDescription>Design system metrics</CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        <div className="flex justify-between"><span>Components</span><span className="font-medium">30+</span></div>
        <div className="flex justify-between"><span>Pages</span><span className="font-medium">12</span></div>
        <div className="flex justify-between"><span>Bundle</span><span className="font-medium">~85 KB</span></div>
      </CardContent>
      <CardFooter>
        <Button size="sm" className="w-full">View Details</Button>
      </CardFooter>
    </Card>
  )
}
