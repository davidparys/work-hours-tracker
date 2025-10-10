"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { db } from "@/lib/database"
import { getMonthDates, formatHours, getActivityLevel, getWeekDayHeaders } from "@/lib/utils/date-helpers"
import { cn } from "@/lib/utils"
import { BulkEntryDialog } from "./bulk-entry-dialog"

interface MonthViewProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  onDayClick: (date: Date) => void
}

export function MonthView({ selectedDate, onDateChange, onDayClick }: MonthViewProps) {
  const [monthlyData, setMonthlyData] = useState<{ [date: string]: number }>({})
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [companySettings, setCompanySettings] = useState<any>(null)

  const monthDates = getMonthDates(selectedDate)
  const totalMonthHours = Object.values(monthlyData).reduce((sum, hours) => sum + hours, 0)
  const workingDays = Object.values(monthlyData).filter((hours) => hours > 0).length

  useEffect(() => {
    loadCompanySettings()
  }, [])

  useEffect(() => {
    loadMonthData()
  }, [selectedDate, companySettings])

  const loadCompanySettings = async () => {
    try {
      const settings = await db.getCompanySettings()
      setCompanySettings(settings)
    } catch (error) {
      console.error("Failed to load company settings:", error)
    }
  }

  const loadMonthData = async () => {
    if (!companySettings) return
    
    setIsLoading(true)
    try {
      const [data, projectList] = await Promise.all([
        db.getWeeklyHours(monthDates.start, monthDates.end),
        db.getProjects(),
      ])
      setMonthlyData(data)
      setProjects(projectList)
    } catch (error) {
      console.error("Failed to load month data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(selectedDate.getMonth() + (direction === "next" ? 1 : -1))
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

  const isToday = (dateString: string): boolean => {
    const today = new Date().toISOString().split("T")[0]
    return dateString === today
  }

  const getCalendarGrid = () => {
    if (!companySettings) return []
    
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    
    // Map week start options to day numbers (0 = Sunday, 1 = Monday, etc.)
    const weekStartMap = {
      'saturday': 6,
      'sunday': 0,
      'monday': 1
    }
    
    const weekStartDay = weekStartMap[companySettings.weekStartsOn]
    const startDate = new Date(firstDay)
    const firstDayOfWeek = firstDay.getDay()
    
    // Calculate the difference, handling the case where we need to go to the previous week
    let diff = firstDayOfWeek - weekStartDay
    if (diff < 0) {
      diff += 7
    }
    
    startDate.setDate(startDate.getDate() - diff)

    const weeks = []
    const currentDate = new Date(startDate)

    while (currentDate <= lastDay || currentDate.getDay() !== weekStartDay) {
      const week = []
      for (let i = 0; i < 7; i++) {
        const dateString = currentDate.toISOString().split("T")[0]
        const isCurrentMonth = currentDate.getMonth() === selectedDate.getMonth()
        const hours = monthlyData[dateString] || 0

        week.push({
          date: new Date(currentDate),
          dateString,
          isCurrentMonth,
          hours,
          isToday: isToday(dateString),
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }
      weeks.push(week)

      if (currentDate > lastDay && currentDate.getDay() === weekStartDay) break
    }

    return weeks
  }

  const monthName = selectedDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-balance">{monthName}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {formatHours(totalMonthHours)} logged • {workingDays} working days •{" "}
            {formatHours(workingDays > 0 ? totalMonthHours / workingDays : 0)} avg per day
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())}>
            This Month
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Month Calendar Grid */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Monthly Activity
            </CardTitle>
            <BulkEntryDialog projects={projects} onEntriesAdded={loadMonthData}>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                Bulk Add Month
              </Button>
            </BulkEntryDialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {getWeekDayHeaders(companySettings?.weekStartsOn || 'sunday').map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="space-y-1">
            {getCalendarGrid().map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={cn(
                      "w-8 h-8 rounded-md border cursor-pointer transition-all hover:scale-105 flex flex-col items-center justify-center relative text-xs",
                      day.isCurrentMonth
                        ? getActivityColor(day.hours)
                        : "bg-muted/30 border-muted/50 text-muted-foreground/50",
                      day.isToday && "ring-2 ring-primary/50 ring-offset-1",
                      !day.isCurrentMonth && "cursor-default hover:scale-100",
                    )}
                    onClick={() => day.isCurrentMonth && onDayClick(day.date)}
                    title={day.isCurrentMonth ? `${day.dateString}: ${formatHours(day.hours)}` : ""}
                  >
                    <div className="font-medium text-[10px]">{day.date.getDate()}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
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

      {/* Monthly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-semibold">{formatHours(totalMonthHours)}</div>
            <p className="text-sm text-muted-foreground">Total Hours</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-semibold">{workingDays}</div>
            <p className="text-sm text-muted-foreground">Working Days</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-semibold">
              {formatHours(workingDays > 0 ? totalMonthHours / workingDays : 0)}
            </div>
            <p className="text-sm text-muted-foreground">Avg per Working Day</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
