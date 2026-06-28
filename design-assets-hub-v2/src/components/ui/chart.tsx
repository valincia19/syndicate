import * as React from "react"
import { cn } from "@/lib/utils"

type ChartConfig = Record<
  string,
  {
    label: string
    color?: string
  }
>

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

const THEME_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

interface ChartContainerProps extends React.ComponentProps<"div"> {
  config: ChartConfig
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: ChartContainerProps) {
  const uniqueId = React.useId()
  const chartId = id || uniqueId

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        {children}
      </div>
    </ChartContext.Provider>
  )
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const cssVars = Object.entries(config).flatMap(([key, item]) => {
    const color = item.color || THEME_COLORS[Object.keys(config).indexOf(key) % THEME_COLORS.length]
    return [
      `--color-${key}: ${color};`,
    ]
  })

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart="${id}"] {${cssVars.join("")}}`,
      }}
    />
  )
}

interface ChartTooltipContentProps extends React.ComponentProps<"div"> {
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  nameKey?: string
  labelKey?: string
}

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  _labelKey,
}: ChartTooltipContentProps & {
  active?: boolean
  payload?: any[]
  label?: string
  labelFormatter?: (value: any) => string
  labelClassName?: string
  formatter?: (value: any, name: any, item: any, index: number, payload: any) => React.ReactNode
  color?: string
}) {
  const { config } = useChart()

  if (!active || !payload?.length) return null

  return (
    <div
      className={cn(
        "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {!hideLabel && (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`
          const itemConfig = config[key as keyof typeof config]
          const indicatorColor = color || item.payload.fill || item.color

          return (
            <div
              key={item.dataKey || index}
              className="flex items-center gap-1.5"
            >
              {!hideIndicator && (
                <div
                  className={cn(
                    "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                    indicator === "dot" && "size-1.5 rounded-full",
                    indicator === "line" && "w-1 shrink-0",
                    indicator === "dashed" && "w-0 border-[1.5px] border-dashed bg-transparent"
                  )}
                  style={
                    indicator === "dot" || indicator === "line"
                      ? { "--color-bg": indicatorColor } as React.CSSProperties
                      : { "--color-border": indicatorColor } as React.CSSProperties
                  }
                />
              )}
              <span className="flex flex-1 items-center gap-1 text-muted-foreground">
                {itemConfig?.label || item.name}
              </span>
              <span className="font-medium tabular-nums">
                {formatter
                  ? formatter(item.value, item.name, item, index, item.payload)
                  : item.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChartLegendContent({
  payload,
}: {
  payload?: any[]
}) {
  const { config } = useChart()
  if (!payload?.length) return null

  return (
    <div className="flex flex-wrap items-center gap-4">
      {payload.map((item, index) => {
        const key = `${item.value}`
        const itemConfig = config[key as keyof typeof config]
        return (
          <div key={index} className="flex items-center gap-1.5 text-xs">
            <div
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">
              {itemConfig?.label || item.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
  ChartStyle,
  type ChartConfig,
}
