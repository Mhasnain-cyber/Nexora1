"use client"

import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { MoreHorizontal } from "lucide-react"
import type { GraphNode } from "@/lib/detection-engine"

interface AccountDistributionChartProps {
  nodes: GraphNode[]
}

export function AccountDistributionChart({ nodes }: AccountDistributionChartProps) {
  // Group by score buckets
  const buckets = [
    { label: "0-10", min: 0, max: 10 },
    { label: "11-20", min: 11, max: 20 },
    { label: "21-30", min: 21, max: 30 },
    { label: "31-50", min: 31, max: 50 },
    { label: "51-70", min: 51, max: 70 },
    { label: "71-85", min: 71, max: 85 },
    { label: "86-100", min: 86, max: 100 },
  ]

  const chartData = buckets.map((bucket) => {
    const clean = nodes.filter(
      (n) => n.score >= bucket.min && n.score <= bucket.max && !n.isSuspicious
    ).length
    const suspicious = nodes.filter(
      (n) => n.score >= bucket.min && n.score <= bucket.max && n.isSuspicious
    ).length
    return {
      range: bucket.label,
      clean,
      suspicious,
    }
  })

  const chartConfig = {
    clean: { label: "Clean Accounts", color: "var(--chart-1)" },
    suspicious: { label: "Suspicious", color: "var(--chart-3)" },
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-sm">Monthly Income vs Expenses</CardTitle>
        <CardAction>
          <button className="text-muted-foreground hover:text-foreground" aria-label="More options">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="range" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={30} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="clean" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="suspicious" stackId="a" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
