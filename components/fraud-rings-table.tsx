"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { FraudRing } from "@/lib/detection-engine"

interface FraudRingsTableProps {
  rings: FraudRing[]
  onSelectRing?: (ring: FraudRing) => void
}

export function FraudRingsTable({ rings, onSelectRing }: FraudRingsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Fraud Ring Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {rings.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No fraud rings detected</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ring ID</TableHead>
                <TableHead>Pattern</TableHead>
                <TableHead className="text-center">Members</TableHead>
                <TableHead className="text-right">Risk Score</TableHead>
                <TableHead>Member Accounts</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rings.map((ring) => (
                <TableRow key={ring.ring_id}>
                  <TableCell className="font-mono text-xs font-medium">
                    {ring.ring_id}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="capitalize text-xs"
                    >
                      {ring.pattern_type.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {ring.member_accounts.length}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-mono text-sm font-bold ${
                        ring.risk_score >= 90
                          ? "text-[var(--destructive)]"
                          : ring.risk_score >= 70
                            ? "text-[var(--warning)]"
                            : "text-[var(--success)]"
                      }`}
                    >
                      {ring.risk_score.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-[200px] flex-wrap gap-1">
                      {ring.member_accounts.slice(0, 3).map((acc) => (
                        <span key={acc} className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {acc}
                        </span>
                      ))}
                      {ring.member_accounts.length > 3 && (
                        <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{ring.member_accounts.length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => onSelectRing?.(ring)}
                      className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      View
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
