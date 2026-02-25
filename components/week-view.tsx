"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Pencil } from "lucide-react"
import { db, type TimeEntry, type Project } from "@/lib/database"
import { getWeekDates, formatHours, getActivityLevel, getWeekDayHeaders } from "@/lib/utils/date-helpers"
import { cn } from "@/lib/utils"
import { BulkEntryDialog } from "./bulk-entry-dialog"
import { BulkEditDialog } from "./bulk-edit-dialog"
import { ProjectFilter } from "./project-filter"
import { ProjectBreakdown } from "./project-breakdown"
import { DateNavigator } from "./date-navigator"

interface WeekViewProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  onDayClick: (date: Date) => void
}

export function WeekView({ selectedDate, onDateChange, onDayClick }: WeekViewProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [userSettings, setUserSettings] = useState<any>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined)

  const weekDates = getWeekDates(selectedDate, companySettings?.weekStartsOn || 'sunday')

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    loadWeekData()
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

  const loadWeekData = async () => {
    if (!companySettings) return
    
    setIsLoading(true)
    try {
      const [timeEntries, projectList] = await Promise.all([
        db.getTimeEntries(weekDates.start, weekDates.end),
        db.getProjects(),
      ])
      setEntries(timeEntries)
      setProjects(projectList)
    } catch (error) {
      console.error("Failed to load week data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter entries based on selected project
  const filteredEntries = selectedProjectId
    ? entries.filter((e) => e.projectId === selectedProjectId)
    : entries

  // Calculate weekly data for calendar grid
  const weeklyData: { [date: string]: number } = {}
  filteredEntries.forEach((entry) => {
    weeklyData[entry.date] = (weeklyData[entry.date] || 0) + entry.duration
  })

  const totalWeekHours = Object.values(weeklyData).reduce((sum, hours) => sum + hours, 0)
  
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

  const getDayName = (dateString: string): string => {
    const date = new Date(dateString + "T00:00:00")
    return date.toLocaleDateString("en-US", { weekday: "short" })
  }

  const getDayNumber = (dateString: string): string => {
    const date = new Date(dateString + "T00:00:00")
    return date.getDate().toString()
  }

  const isToday = (dateString: string): boolean => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayString = `${year}-${month}-${day}`
    return dateString === todayString
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
        <DateNavigator
          mode="week"
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          weekStartsOn={companySettings?.weekStartsOn}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  Weekly Activity
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
                      periodLabel={`Week of ${new Date(weekDates.start + "T00:00:00").toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}`}
                      onEntriesUpdated={loadWeekData}
                    >
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                        <Pencil className="h-4 w-4" />
                        Bulk Edit
                      </Button>
                    </BulkEditDialog>
                  )}
                  <BulkEntryDialog projects={projects} onEntriesAdded={loadWeekData}>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      Bulk Add
                    </Button>
                  </BulkEntryDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-3 mb-3">
                {getWeekDayHeaders(companySettings?.weekStartsOn || 'sunday').map((dayName) => (
                  <div key={dayName} className="text-center text-xs font-medium text-muted-foreground">
                    {dayName}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-3">
                {weekDates.dates.map((date) => {
                  const hours = weeklyData[date] || 0
                  const dayNumber = getDayNumber(date)
                  const today = isToday(date)

                  return (
                    <div key={date} className="flex justify-center">
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

        <div>
          <ProjectBreakdown
            projects={projects}
            data={projectBreakdown}
            totalHours={entries.reduce((sum, e) => sum + e.duration, 0)}
            totalEarnings={totalEarnings}
          />
        </div>
      </div>
    </div>
  )
}
