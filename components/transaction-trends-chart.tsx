"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts"
import { Eye } from "lucide-react"
import type { GraphEdge } from "@/lib/detection-engine"

interface TransactionTrendsChartProps {
  edges: GraphEdge[]
  totalSuspiciousAmount: number
}

export function TransactionTrendsChart({ edges, totalSuspiciousAmount }: TransactionTrendsChartProps) {
  // Group by date
  const dateMap = new Map<string, { total: number; suspicious: number }>()
  for (const edge of edges) {
    const date = edge.timestamp.split(' ')[0] || edge.timestamp
    if (!dateMap.has(date)) dateMap.set(date, { total: 0, suspicious: 0 })
    const entry = dateMap.get(date)!
    entry.total += edge.amount
    if (edge.isRingEdge) entry.suspicious += edge.amount
  }

  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: date.length > 10 ? date.slice(5, 10) : date.slice(5),
      total: Math.round(data.total),
      suspicious: Math.round(data.suspicious),
    }))

  const chartConfig = {
    total: { label: "Total Flow", color: "var(--chart-1)" },
    suspicious: { label: "Suspicious Flow", color: "var(--chart-3)" },
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Balance Trends</p>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl font-bold">
                ${totalSuspiciousAmount.toLocaleString()}
              </CardTitle>
              <button className="text-muted-foreground" aria-label="Toggle visibility">
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground">NET TRADE</span>
              <span className="font-mono text-foreground">${Math.round(totalSuspiciousAmount * 0.6).toLocaleString()}</span>
              <span className="font-mono text-[var(--destructive)]">${Math.round(totalSuspiciousAmount * 0.4).toLocaleString()}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground">Last Month</span>
              <span className="font-medium text-[var(--success)]">+12.25%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="suspiciousGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#totalGradient)"
            />
            <Area
              type="monotone"
              dataKey="suspicious"
              stroke="var(--chart-2)"
              strokeWidth={2}
              fill="url(#suspiciousGradient)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
