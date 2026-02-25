"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Project } from "@/lib/database"
import { formatHours } from "@/lib/utils/date-helpers"
import { useCurrency } from "@/lib/context/currency-context"
import { PieChart, Eye, EyeOff } from "lucide-react"

interface ProjectBreakdownProps {
  projects: Project[]
  data: {
    projectId: number | undefined
    hours: number
    earnings?: number
    effectiveRate?: number
  }[]
  totalHours: number
  totalEarnings?: number
  hiddenProjectIds?: Set<number | "none">
  onToggleProject?: (projectId: number | "none") => void
}

export function ProjectBreakdown({
  projects,
  data,
  totalHours,
  totalEarnings,
  hiddenProjectIds = new Set(),
  onToggleProject,
}: ProjectBreakdownProps) {
  const { formatAmount } = useCurrency()

  const getProjectName = (id: number | undefined) => {
    if (!id) return "No Project"
    return projects.find((p) => p.id === id)?.name || "Unknown Project"
  }

  const getProjectColor = (id: number | undefined) => {
    if (!id) return "#94a3b8" // slate-400 for no project
    return projects.find((p) => p.id === id)?.color || "#94a3b8"
  }

  const getKey = (id: number | undefined): number | "none" => id ?? "none"

  // Sort all data by hours descending (including hidden, so order stays stable)
  const sortedData = [...data].sort((a, b) => b.hours - a.hours)

  // Visible items only contribute to the displayed total
  const visibleData = sortedData.filter((item) => !hiddenProjectIds.has(getKey(item.projectId)))
  const visibleTotalHours = visibleData.reduce((sum, item) => sum + item.hours, 0)

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieChart className="h-5 w-5 text-primary" />
          Project Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedData.map((item) => {
            const key = getKey(item.projectId)
            const isHidden = hiddenProjectIds.has(key)
            const percentage =
              visibleTotalHours > 0 && !isHidden ? (item.hours / visibleTotalHours) * 100 : 0
            const color = getProjectColor(item.projectId)

            return (
              <div key={item.projectId ?? "none"} className={isHidden ? "opacity-40" : undefined}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {onToggleProject && (
                      <button
                        onClick={() => onToggleProject(key)}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        title={isHidden ? "Show project" : "Hide project"}
                      >
                        {isHidden ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium truncate">{getProjectName(item.projectId)}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-muted-foreground">{formatHours(item.hours)}</span>
                    {item.effectiveRate !== undefined && item.effectiveRate > 0 && (
                      <span className="text-muted-foreground/70 text-xs">
                        {formatAmount(item.effectiveRate)}/h
                      </span>
                    )}
                    {item.earnings !== undefined && item.earnings > 0 && (
                      <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">
                        {formatAmount(item.earnings)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            )
          })}

          {sortedData.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No data available for this period
            </div>
          )}

          {totalEarnings !== undefined && totalEarnings > 0 && (
            <div className="pt-4 mt-4 border-t border-border/50 flex justify-between items-center">
              <span className="font-medium">Total Earnings</span>
              <span className="text-lg font-bold text-primary">
                {formatAmount(totalEarnings)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
