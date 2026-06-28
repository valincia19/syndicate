import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-none border font-bold uppercase tracking-wider",
  {
    variants: {
      variant: {
        success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        danger: "bg-red-500/10 text-red-500 border-red-500/20",
        warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        neutral: "bg-muted/30 text-muted-foreground border-border",
        hot: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      },
      size: {
        xs: "px-1 py-0.5 text-[9px]",
        sm: "px-1.5 py-0.5 text-[9px]",
        md: "px-1.5 py-0.5 text-[10px]",
      },
    },
    defaultVariants: {
      variant: "success",
      size: "sm",
    },
  }
)

const dotVariants: Record<string, string> = {
  success: "bg-emerald-500",
  danger: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
  neutral: "bg-muted-foreground",
  hot: "bg-orange-500",
}

interface StatusBadgeProps extends VariantProps<typeof badgeVariants> {
  label: string
  /** Show an animated pulse dot before the label */
  pulse?: boolean
  /** Show a static dot before the label */
  dot?: boolean
  /** Optional icon rendered before the label */
  icon?: React.ReactNode
  className?: string
}

export function StatusBadge({
  label,
  variant = "success",
  size = "sm",
  pulse = false,
  dot = false,
  icon,
  className,
}: StatusBadgeProps) {
  const showDot = pulse || dot

  return (
    <span className={cn(badgeVariants({ variant, size }), className)}>
      {showDot && (
        <span
          className={cn(
            size === "md" ? "h-1.5 w-1.5" : "h-1 w-1",
            "rounded-none",
            dotVariants[variant ?? "success"],
            pulse && "animate-pulse"
          )}
        />
      )}
      {icon}
      {label}
    </span>
  )
}
