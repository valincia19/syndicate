import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function TooltipDemo() {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        {["JD", "AM", "RK", "SN"].map((initials, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <Avatar className="size-8 cursor-pointer text-xs">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom">Team member {i + 1}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
