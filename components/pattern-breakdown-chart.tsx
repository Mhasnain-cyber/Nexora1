"use client"

import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, Label } from "recharts"
import { MoreHorizontal } from "lucide-react"
import type { SuspiciousAccount } from "@/lib/detection-engine"

interface PatternBreakdownChartProps {
  accounts: SuspiciousAccount[]
}

export function PatternBreakdownChart({ accounts }: PatternBreakdownChartProps) {
  const patternCounts: Record<string, number> = {}
  for (const acc of accounts) {
    for (const pattern of acc.detected_patterns) {
      const label = pattern.replace(/_/g, ' ').replace(/cycle length \d+/, 'Cycle')
      patternCounts[label] = (patternCounts[label] || 0) + 1
    }
  }

  const COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--muted-foreground)",
  ]

  const data = Object.entries(patternCounts).map(([name, value], i) => ({
    name,
    value,
    fill: COLORS[i % COLORS.length],
  }))

  const total = data.reduce((sum, d) => sum + d.value, 0)

  const chartConfig: Record<string, { label: string; color: string }> = {}
  data.forEach((d, i) => {
    chartConfig[d.name] = { label: d.name, color: COLORS[i % COLORS.length] }
  })

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pattern Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">No patterns detected</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Monthly Expenses Breakdown</CardTitle>
        <CardAction>
          <button className="text-muted-foreground hover:text-foreground" aria-label="More options">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[200px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              strokeWidth={2}
              stroke="var(--card)"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                          100%
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Legend around chart - percentage labels */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.fill }} />
              <span className="text-xs capitalize text-muted-foreground">{d.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
