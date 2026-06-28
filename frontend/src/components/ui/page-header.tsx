import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
}

export function PageHeader({ title, description, className, children }: PageHeaderProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <h3 className="font-bold text-sm tracking-tight uppercase">{title}</h3>
      {description && (
        <p className="text-[10px] text-muted-foreground font-medium">{description}</p>
      )}
      {children}
    </div>
  )
}
