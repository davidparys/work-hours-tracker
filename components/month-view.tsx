"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Pencil } from "lucide-react"
import { db, type TimeEntry, type Project } from "@/lib/database"
import { getMonthDates, formatHours, getActivityLevel, getWeekDayHeaders, formatDate } from "@/lib/utils/date-helpers"
import { cn } from "@/lib/utils"
import { BulkEntryDialog } from "./bulk-entry-dialog"
import { BulkEditDialog } from "./bulk-edit-dialog"
import { ProjectFilter } from "./project-filter"
import { ProjectBreakdown } from "./project-breakdown"
import { DateNavigator } from "./date-navigator"

interface MonthViewProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  onDayClick: (date: Date) => void
}

export function MonthView({ selectedDate, onDateChange, onDayClick }: MonthViewProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [userSettings, setUserSettings] = useState<any>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined)

  const monthDates = getMonthDates(selectedDate)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    loadMonthData()
  }, [selectedDate, companySettings])

  const loadSettings = async () => {
    try {
      const [companySettingsData, userSettingsData] = await Promise.all([
        db.getCompanySettings(),
        db.getUserSettings(),
      ])
      setCompanySettings(companySettingsData)
      setUserSettings(userSettingsData)
    } catch (error) {
      console.error("Failed to load settings:", error)
    }
  }

  const loadMonthData = async () => {
    if (!companySettings) return
    
    setIsLoading(true)
    try {
      const [timeEntries, projectList] = await Promise.all([
        db.getTimeEntries(monthDates.start, monthDates.end),
        db.getProjects(),
      ])
      setEntries(timeEntries)
      setProjects(projectList)
    } catch (error) {
      console.error("Failed to load month data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter entries based on selected project
  const filteredEntries = selectedProjectId
    ? entries.filter((e) => e.projectId === selectedProjectId)
    : entries

  // Calculate monthly data for calendar grid
  const monthlyData: { [date: string]: number } = {}
  filteredEntries.forEach((entry) => {
    monthlyData[entry.date] = (monthlyData[entry.date] || 0) + entry.duration
  })

  const totalMonthHours = Object.values(monthlyData).reduce((sum, hours) => sum + hours, 0)
  const workingDays = Object.values(monthlyData).filter((hours) => hours > 0).length

  // Calculate project breakdown
  const projectBreakdown = projects.map(project => {
    const projectEntries = entries.filter(e => e.projectId === project.id)
    const hours = projectEntries.reduce((sum, e) => sum + e.duration, 0)
    const earnings = projectEntries.reduce((sum, e) => sum + (e.duration * (e.billableRate || 0)), 0)
    return {
      projectId: project.id,
      hours,
      earnings
    }
  }).filter(p => p.hours > 0)

  // Add entries with no project
  const noProjectEntries = entries.filter(e => !e.projectId)
  if (noProjectEntries.length > 0) {
    const hours = noProjectEntries.reduce((sum, e) => sum + e.duration, 0)
    const earnings = noProjectEntries.reduce((sum, e) => sum + (e.duration * (e.billableRate || 0)), 0)
    projectBreakdown.push({
      projectId: undefined,
      hours,
      earnings
    })
  }

  const totalEarnings = entries.reduce((sum, e) => sum + (e.duration * (e.billableRate || 0)), 0)

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
    const today = formatDate(new Date())
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
    
    const weekStartDay = weekStartMap[companySettings.weekStartsOn as keyof typeof weekStartMap]
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
        const dateString = formatDate(currentDate)
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
        <DateNavigator
          mode="month"
          selectedDate={selectedDate}
          onDateChange={onDateChange}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Month Calendar Grid */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  Monthly Activity
                </CardTitle>
                <div className="flex items-center gap-2">
                  <ProjectFilter 
                    projects={projects} 
                    selectedProjectId={selectedProjectId} 
                    onProjectChange={setSelectedProjectId} 
                  />
                  {entries.length > 0 && (
                    <BulkEditDialog 
                      entries={entries} 
                      projects={projects}
                      periodLabel={monthName}
                      onEntriesUpdated={loadMonthData}
                    >
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                        <Pencil className="h-4 w-4" />
                        Bulk Edit
                      </Button>
                    </BulkEditDialog>
                  )}
                  <BulkEntryDialog projects={projects} onEntriesAdded={loadMonthData}>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      Bulk Add
                    </Button>
                  </BulkEntryDialog>
                </div>
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
                      <div key={dayIndex} className="flex justify-center">
                        <div
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

        <div>
          <ProjectBreakdown 
            projects={projects} 
            data={projectBreakdown} 
            totalHours={entries.reduce((sum, e) => sum + e.duration, 0)}
            totalEarnings={totalEarnings}
            currency={userSettings?.currency || 'USD'}
          />
        </div>
      </div>
    </div>
  )
}
