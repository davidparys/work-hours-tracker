"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Project } from "@/lib/database"
import { formatHours } from "@/lib/utils/date-helpers"
import { useCurrency } from "@/lib/context/currency-context"
import { PieChart } from "lucide-react"

interface ProjectBreakdownProps {
  projects: Project[]
  data: {
    projectId: number | undefined
    hours: number
    earnings?: number
  }[]
  totalHours: number
  totalEarnings?: number
}

export function ProjectBreakdown({ projects, data, totalHours, totalEarnings }: ProjectBreakdownProps) {
  const { formatAmount } = useCurrency()

  const getProjectName = (id: number | undefined) => {
    if (!id) return "No Project"
    return projects.find((p) => p.id === id)?.name || "Unknown Project"
  }

  const getProjectColor = (id: number | undefined) => {
    if (!id) return "#94a3b8" // slate-400 for no project
    return projects.find((p) => p.id === id)?.color || "#94a3b8"
  }

  // Sort data by hours descending
  const sortedData = [...data].sort((a, b) => b.hours - a.hours)

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
            const percentage = totalHours > 0 ? (item.hours / totalHours) * 100 : 0

            return (
              <div key={item.projectId || "none"} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getProjectColor(item.projectId) }}
                    />
                    <span className="font-medium">{getProjectName(item.projectId)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{formatHours(item.hours)}</span>
                    {item.earnings !== undefined && (
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
                      backgroundColor: getProjectColor(item.projectId),
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
