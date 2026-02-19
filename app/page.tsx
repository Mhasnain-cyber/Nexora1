"use client"

import { useState, useCallback } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { WelcomeSection } from "@/components/welcome-section"
import { StatCards } from "@/components/stat-cards"
import { TransactionTrendsChart } from "@/components/transaction-trends-chart"
import { PatternBreakdownChart } from "@/components/pattern-breakdown-chart"
import { RingBudgets } from "@/components/ring-budgets"
import { AccountDistributionChart } from "@/components/account-distribution-chart"
import { CSVUpload } from "@/components/csv-upload"
import { FraudRingsTable } from "@/components/fraud-rings-table"
import { SuspiciousAccountsTable } from "@/components/suspicious-accounts-table"
import { GraphVisualization } from "@/components/graph-visualization"
import { analyzeTransactions } from "@/lib/detection-engine"
import type { AnalysisReport, GraphNode, GraphEdge, FraudRing, ColumnMapping } from "@/lib/detection-engine"

export default function DashboardPage() {
  const [activeView, setActiveView] = useState("home")
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlightRing, setHighlightRing] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleFileProcessed = useCallback((csvText: string) => {
    setIsProcessing(true)
    setError(null)

    // Use setTimeout to allow the UI to update with the loading state
    setTimeout(() => {
      try {
        const result = analyzeTransactions(csvText)
        setReport(result.report)
        setNodes(result.nodes)
        setEdges(result.edges)
        setActiveView("home")
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred during analysis.")
      } finally {
        setIsProcessing(false)
      }
    }, 100)
  }, [])

  const handleDownloadReport = useCallback(() => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "report.json"
    a.click()
    URL.revokeObjectURL(url)
  }, [report])

  const handleReset = useCallback(() => {
    setReport(null)
    setNodes([])
    setEdges([])
    setActiveView("home")
    setHighlightRing(null)
    setError(null)
  }, [])

  const handleSelectRing = useCallback((ring: FraudRing) => {
    setHighlightRing(ring.ring_id)
    setActiveView("graph")
  }, [])

  const totalSuspiciousAmount = report
    ? edges.filter((e) => e.isRingEdge).reduce((sum, e) => sum + e.amount, 0)
    : 0

  const renderContent = () => {
    // If no report, show upload on home or upload view
    if (!report && (activeView === "home" || activeView === "upload")) {
      return (
        <div className="flex flex-col gap-6">
          <WelcomeSection hasReport={false} />
          <CSVUpload onFileProcessed={handleFileProcessed} isProcessing={isProcessing} />
          {error && (
            <div className="mx-auto max-w-2xl rounded-lg border border-[var(--destructive)] bg-[var(--destructive)]/5 px-4 py-3 text-sm text-[var(--destructive)]">
              {error}
            </div>
          )}
        </div>
      )
    }

    if (!report) {
      return (
        <div className="flex flex-col gap-6">
          <WelcomeSection hasReport={false} />
          <CSVUpload onFileProcessed={handleFileProcessed} isProcessing={isProcessing} />
        </div>
      )
    }

    switch (activeView) {
      case "home":
        return (
          <div className="flex flex-col gap-6">
            <WelcomeSection hasReport onReset={handleReset} onDownload={handleDownloadReport} />

            {/* 4 stat cards in a row - matching screenshot */}
            <StatCards report={report} />

            {/* Balance Trends + Donut chart row - matching screenshot layout */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <TransactionTrendsChart edges={edges} totalSuspiciousAmount={totalSuspiciousAmount} />
              <PatternBreakdownChart accounts={report.suspicious_accounts} />
            </div>

            {/* Monthly Budgets + Bar chart row - matching screenshot layout */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <RingBudgets rings={report.fraud_rings} />
              <AccountDistributionChart nodes={nodes} />
            </div>
          </div>
        )

      case "upload":
        return (
          <div className="flex flex-col gap-6">
            <WelcomeSection hasReport onReset={handleReset} onDownload={handleDownloadReport} />
            <CSVUpload onFileProcessed={handleFileProcessed} isProcessing={isProcessing} />
            {error && (
              <div className="mx-auto max-w-2xl rounded-lg border border-[var(--destructive)] bg-[var(--destructive)]/5 px-4 py-3 text-sm text-[var(--destructive)]">
                {error}
              </div>
            )}
          </div>
        )

      case "graph":
        return (
          <div className="flex flex-col gap-6">
            <WelcomeSection hasReport onReset={handleReset} onDownload={handleDownloadReport} />
            <GraphVisualization nodes={nodes} edges={edges} highlightRing={highlightRing} />
            {highlightRing && (
              <button
                onClick={() => setHighlightRing(null)}
                className="self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                Clear Ring Highlight
              </button>
            )}
          </div>
        )

      case "rings":
        return (
          <div className="flex flex-col gap-6">
            <WelcomeSection hasReport onReset={handleReset} onDownload={handleDownloadReport} />
            <FraudRingsTable rings={report.fraud_rings} onSelectRing={handleSelectRing} />
          </div>
        )

      case "accounts":
        return (
          <div className="flex flex-col gap-6">
            <WelcomeSection hasReport onReset={handleReset} onDownload={handleDownloadReport} />
            <SuspiciousAccountsTable accounts={report.suspicious_accounts} />
          </div>
        )

      case "report":
        return (
          <div className="flex flex-col gap-6">
            <WelcomeSection hasReport onReset={handleReset} onDownload={handleDownloadReport} />
            <StatCards report={report} />
            <FraudRingsTable rings={report.fraud_rings} onSelectRing={handleSelectRing} />
            <SuspiciousAccountsTable accounts={report.suspicious_accounts} />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - fixed left like screenshot */}
      <AppSidebar
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view)
          setMobileMenuOpen(false)
        }}
        hasReport={!!report}
      />

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="h-full w-64" onClick={(e) => e.stopPropagation()}>
            <AppSidebar
              activeView={activeView}
              onViewChange={(view) => {
                setActiveView(view)
                setMobileMenuOpen(false)
              }}
              hasReport={!!report}
              forceMobile
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 lg:ml-64">
        <AppHeader
          report={report}
          onMenuToggle={() => setMobileMenuOpen((o) => !o)}
          onDownloadReport={handleDownloadReport}
        />
        <div className="p-4 lg:p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
