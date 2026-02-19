"use client"

import { RotateCcw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WelcomeSectionProps {
  hasReport: boolean
  onReset?: () => void
  onDownload?: () => void
}

export function WelcomeSection({ hasReport, onReset, onDownload }: WelcomeSectionProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          {hasReport ? "Analysis Complete" : "Good Morning, Nexora"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {hasReport
            ? "Financial forensics analysis results are displayed below."
            : "Welcome Back! Upload transaction data to begin analysis."}
        </p>
      </div>
      {hasReport && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Data
          </Button>
          <Button size="sm" onClick={onDownload} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      )}
    </div>
  )
}
