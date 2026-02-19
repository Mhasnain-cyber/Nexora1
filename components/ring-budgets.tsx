"use client"

import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { MoreHorizontal, AlertTriangle, Shield, Network, Zap, Layers } from "lucide-react"
import type { FraudRing } from "@/lib/detection-engine"

interface RingBudgetsProps {
  rings: FraudRing[]
}

const ringIcons: Record<string, typeof Shield> = {
  cycle: Shield,
  smurfing_fan_in: Zap,
  smurfing_fan_out: Network,
  shell: Layers,
}

const ringColors: Record<string, string> = {
  cycle: "var(--chart-1)",
  smurfing_fan_in: "var(--chart-5)",
  smurfing_fan_out: "var(--chart-4)",
  shell: "var(--chart-2)",
}

export function RingBudgets({ rings }: RingBudgetsProps) {
  const displayRings = rings.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Monthly Budgets</CardTitle>
        <CardAction>
          <button className="text-muted-foreground hover:text-foreground" aria-label="More options">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {displayRings.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No fraud rings detected</p>
        ) : (
          displayRings.map((ring) => {
            const Icon = ringIcons[ring.pattern_type] || AlertTriangle
            const color = ringColors[ring.pattern_type] || "var(--chart-1)"
            return (
              <div key={ring.ring_id} className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground capitalize">
                      {ring.pattern_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      <span style={{ color }}>{Math.round(ring.risk_score)}</span>
                      <span className="text-muted-foreground"> / 100</span>
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${ring.risk_score}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
