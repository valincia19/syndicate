import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

const items = ["Colors", "Typography", "Spacing", "Shadows", "Radius", "Icons"]

export function CarouselDemo() {
  return (
    <Carousel className="w-full">
      <CarouselContent>
        {items.map((item) => (
          <CarouselItem key={item} className="basis-1/2">
            <Card>
              <CardContent className="flex aspect-square items-center justify-center p-4">
                <span className="text-sm font-medium text-center">{item}</span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="flex justify-center gap-2 mt-2">
        <CarouselPrevious className="static translate-y-0 size-7" />
        <CarouselNext className="static translate-y-0 size-7" />
      </div>
    </Carousel>
  )
}
