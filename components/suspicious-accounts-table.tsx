"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { SuspiciousAccount } from "@/lib/detection-engine"

interface SuspiciousAccountsTableProps {
  accounts: SuspiciousAccount[]
}

export function SuspiciousAccountsTable({ accounts }: SuspiciousAccountsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Suspicious Accounts (Top 20)</CardTitle>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No suspicious accounts detected</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account ID</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Patterns</TableHead>
                <TableHead>Ring</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.slice(0, 20).map((acc) => (
                <TableRow key={acc.account_id}>
                  <TableCell className="font-mono text-xs font-medium">{acc.account_id}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-mono text-sm font-bold ${
                        acc.suspicion_score >= 70
                          ? "text-[var(--destructive)]"
                          : acc.suspicion_score >= 40
                            ? "text-[var(--warning)]"
                            : "text-foreground"
                      }`}
                    >
                      {acc.suspicion_score}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap gap-1">
                        {acc.detected_patterns.map((p) => (
                          <Badge key={p} variant="outline" className="text-[10px]">
                            {p}
                          </Badge>
                        ))}
                      </div>
                      {acc.explanation && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight" title={acc.explanation}>
                          {acc.explanation}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">{acc.ring_id}</span>
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
