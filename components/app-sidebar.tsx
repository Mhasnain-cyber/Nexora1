"use client"

import { Home, Wallet, Target, BarChart3, Shield, Upload, Network, FileText, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface AppSidebarProps {
  activeView: string
  onViewChange: (view: string) => void
  hasReport: boolean
  forceMobile?: boolean
}

const navItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "upload", label: "Upload CSV", icon: Upload },
  { id: "graph", label: "Graph View", icon: Network },
  { id: "rings", label: "Fraud Rings", icon: Shield },
  { id: "accounts", label: "Accounts", icon: Wallet },
  { id: "report", label: "Report", icon: FileText },
]

export function AppSidebar({ activeView, onViewChange, hasReport, forceMobile }: AppSidebarProps) {
  return (
    <aside className={cn(
      "fixed left-0 top-0 z-30 h-screen w-64 flex-col border-r border-border bg-card",
      forceMobile ? "flex" : "hidden lg:flex"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground">Nexora</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isDisabled = !hasReport && !["home", "upload"].includes(item.id)
            return (
              <li key={item.id}>
                <button
                  onClick={() => !isDisabled && onViewChange(item.id)}
                  disabled={isDisabled}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    activeView === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    isDisabled && "cursor-not-allowed opacity-40"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {activeView === item.id && (
                    <ChevronRight className="ml-auto h-4 w-4" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>


    </aside>
  )
}
