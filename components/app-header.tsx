"use client"

import { Search, Bell, Settings, Menu, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AnalysisReport } from "@/lib/detection-engine"

interface AppHeaderProps {
  report: AnalysisReport | null
  onMenuToggle: () => void
  onDownloadReport: () => void
}

export function AppHeader({ report, onMenuToggle, onDownloadReport }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 md:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-40 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {report && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadReport}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        )}

        <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>
        <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent" aria-label="Settings">
          <Settings className="h-4 w-4" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2 rounded-lg border border-border px-2 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            N
          </div>
          <div className="hidden flex-col sm:flex">
            <span className="text-xs font-medium text-foreground">Nexora</span>
            <span className="text-[10px] text-muted-foreground">Forensics</span>
          </div>
        </div>
      </div>
    </header>
  )
}
