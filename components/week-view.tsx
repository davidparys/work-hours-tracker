"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { db } from "@/lib/database"
import { getWeekDates, formatHours, getActivityLevel } from "@/lib/utils/date-helpers"
import { cn } from "@/lib/utils"
import { BulkEntryDialog } from "./bulk-entry-dialog"

interface WeekViewProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  onDayClick: (date: Date) => void
}

export function WeekView({ selectedDate, onDateChange, onDayClick }: WeekViewProps) {
  const [weeklyData, setWeeklyData] = useState<{ [date: string]: number }>({})
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const weekDates = getWeekDates(selectedDate)
  const totalWeekHours = Object.values(weeklyData).reduce((sum, hours) => sum + hours, 0)

  useEffect(() => {
    loadWeekData()
  }, [selectedDate])

  const loadWeekData = async () => {
    setIsLoading(true)
    try {
      const [data, projectList] = await Promise.all([
        db.getWeeklyHours(weekDates.start, weekDates.end),
        db.getProjects(),
      ])
      setWeeklyData(data)
      setProjects(projectList)
    } catch (error) {
      console.error("Failed to load week data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + (direction === "next" ? 7 : -7))
    onDateChange(newDate)
  }

  const getActivityColor = (hours: number): string => {
    const level = getActivityLevel(hours)
    switch (level) {
      case "none":
        return "bg-muted/50 border-border/50"
      case "low":
        return "bg-primary/20 border-primary/30"
      case "medium":
        return "bg-primary/50 border-primary/60"
      case "high":
        return "bg-primary border-primary"
      default:
        return "bg-muted/50 border-border/50"
    }
  }

  const getDayName = (dateString: string): string => {
    const date = new Date(dateString + "T00:00:00")
    return date.toLocaleDateString("en-US", { weekday: "short" })
  }

  const getDayNumber = (dateString: string): string => {
    const date = new Date(dateString + "T00:00:00")
    return date.getDate().toString()
  }

  const isToday = (dateString: string): boolean => {
    const today = new Date().toISOString().split("T")[0]
    return dateString === today
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-balance">
            Week of{" "}
            {new Date(weekDates.start + "T00:00:00").toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {formatHours(totalWeekHours)} logged • {formatHours(totalWeekHours / 7)} avg per day
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())}>
            This Week
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Weekly Activity
            </CardTitle>
            <BulkEntryDialog projects={projects} onEntriesAdded={loadWeekData}>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                Bulk Add Week
              </Button>
            </BulkEntryDialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-3">
            {weekDates.dates.map((date) => {
              const hours = weeklyData[date] || 0
              const dayName = getDayName(date)
              const dayNumber = getDayNumber(date)
              const today = isToday(date)

              return (
                <div key={date} className="text-center">
                  <div className="text-xs text-muted-foreground mb-2 font-medium">{dayName}</div>
                  <div
                    className={cn(
                      "w-12 h-12 rounded-lg border cursor-pointer transition-all hover:scale-105 flex flex-col items-center justify-center relative",
                      getActivityColor(hours),
                      today && "ring-2 ring-primary/50 ring-offset-1",
                    )}
                    onClick={() => onDayClick(new Date(date + "T00:00:00"))}
                    title={`${date}: ${formatHours(hours)}`}
                  >
                    <div className="text-sm font-medium">{dayNumber}</div>
                    {hours > 0 && (
                      <div className="text-[10px] opacity-80 font-mono">
                        {hours >= 1 ? `${Math.round(hours)}h` : `${Math.round(hours * 60)}m`}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-sm bg-muted/50 border border-border/50" />
              <div className="w-2 h-2 rounded-sm bg-primary/20 border border-primary/30" />
              <div className="w-2 h-2 rounded-sm bg-primary/50 border border-primary/60" />
              <div className="w-2 h-2 rounded-sm bg-primary border border-primary" />
            </div>
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {weekDates.dates.map((date) => {
              const hours = weeklyData[date] || 0
              const dayName = getDayName(date)
              const dayNumber = getDayNumber(date)
              const today = isToday(date)

              return (
                <div
                  key={date}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/30 transition-colors",
                    today && "bg-primary/5 border-primary/20",
                  )}
                  onClick={() => onDayClick(new Date(date + "T00:00:00"))}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium min-w-[70px]">
                      {dayName} {dayNumber}
                    </div>
                    <div className={cn("w-3 h-3 rounded border", getActivityColor(hours))} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={hours > 0 ? "default" : "secondary"} className="text-xs">
                      {formatHours(hours)}
                    </Badge>
                    {today && (
                      <Badge variant="outline" className="text-xs">
                        Today
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
