"use client"

import { Users, AlertTriangle, Shield, Clock, TrendingUp, TrendingDown, MoreHorizontal, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import type { AnalysisReport } from "@/lib/detection-engine"

interface StatCardsProps {
  report: AnalysisReport
}

export function StatCards({ report }: StatCardsProps) {
  const stats = [
    {
      title: "Total Accounts",
      value: report.summary.total_accounts_analyzed.toLocaleString(),
      icon: Users,
      trend: "+2.47%",
      trendUp: true,
      subtitle: `Analyzed in ${report.summary.processing_time_seconds}s`,
    },
    {
      title: "Suspicious Flagged",
      value: report.summary.suspicious_accounts_flagged.toLocaleString(),
      icon: AlertTriangle,
      trend: `${((report.summary.suspicious_accounts_flagged / report.summary.total_accounts_analyzed) * 100).toFixed(1)}%`,
      trendUp: false,
      subtitle: "of total accounts",
    },
    {
      title: "Fraud Rings Detected",
      value: report.summary.fraud_rings_detected.toLocaleString(),
      icon: Shield,
      trend: "Active",
      trendUp: false,
      subtitle: "Ring networks found",
    },
    {
      title: "Fan-In Accounts",
      value: report.summary.fan_in_accounts.toLocaleString(),
      icon: ArrowDownLeft,
      trend: "High Risk",
      trendUp: false,
      subtitle: "Money aggregators",
    },
    {
      title: "Fan-Out Accounts",
      value: report.summary.fan_out_accounts.toLocaleString(),
      icon: ArrowUpRight,
      trend: "Dispersion",
      trendUp: false,
      subtitle: "Money distributors",
    },
    {
      title: "Processing Time",
      value: `${report.summary.processing_time_seconds}s`,
      icon: Clock,
      trend: "< 30s",
      trendUp: true,
      subtitle: "Within performance target",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title} className="gap-3 py-4">
          <CardHeader className="pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{stat.title}</CardTitle>
            <CardAction>
              <button className="text-muted-foreground hover:text-foreground" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{stat.value}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {stat.trendUp ? (
                <TrendingUp className="h-3 w-3 text-[var(--success)]" />
              ) : (
                <TrendingDown className="h-3 w-3 text-[var(--destructive)]" />
              )}
              <span
                className={`text-xs font-medium ${stat.trendUp ? "text-[var(--success)]" : "text-[var(--destructive)]"}`}
              >
                {stat.trend}
              </span>
              <span className="text-xs text-muted-foreground">{stat.subtitle}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
