"use client"

import { useState } from "react"
import { DayView } from "@/components/day-view"
import { WeekView } from "@/components/week-view"
import { MonthView } from "@/components/month-view"
import { ExportDialog } from "@/components/export-dialog"
import { ProjectManager } from "@/components/project-manager"
import { DataManager } from "@/components/data-manager"
import { CompanySettings } from "@/components/company-settings"
import { PersonalSettings } from "@/components/personal-settings"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Calendar, BarChart3, FileText, Settings, Database, Palette, Building2, User } from "lucide-react"
import { getWeekDates, getMonthDates } from "@/lib/utils/date-helpers"

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<"day" | "week" | "month">("day")
  const [refreshKey, setRefreshKey] = useState(0)

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setCurrentView("day")
  }

  const handleDataChange = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const getExportDateRange = () => {
    switch (currentView) {
      case "week": {
        const { start, end } = getWeekDates(selectedDate)
        return {
          start: new Date(start + "T00:00:00"),
          end: new Date(end + "T00:00:00"),
        }
      }
      case "month": {
        const { start, end } = getMonthDates(selectedDate)
        return {
          start: new Date(start + "T00:00:00"),
          end: new Date(end + "T00:00:00"),
        }
      }
      default:
        return {
          start: selectedDate,
          end: selectedDate,
        }
    }
  }

  const exportRange = getExportDateRange()

  return (
    <div className="min-h-screen bg-background" key={refreshKey}>
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-8">
              <h1 className="text-lg font-semibold text-foreground">TimeTracker</h1>
              <div className="flex gap-1">
                <Button
                  variant={currentView === "day" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentView("day")}
                  className="gap-2 text-sm"
                >
                  <Calendar className="h-4 w-4" />
                  Day
                </Button>
                <Button
                  variant={currentView === "week" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentView("week")}
                  className="gap-2 text-sm"
                >
                  <BarChart3 className="h-4 w-4" />
                  Week
                </Button>
                <Button
                  variant={currentView === "month" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentView("month")}
                  className="gap-2 text-sm"
                >
                  <BarChart3 className="h-4 w-4" />
                  Month
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ExportDialog defaultStartDate={exportRange.start} defaultEndDate={exportRange.end}>
                <Button variant="outline" size="sm" className="gap-2 text-sm bg-transparent">
                  <FileText className="h-4 w-4" />
                  Export PDF
                </Button>
              </ExportDialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <ProjectManager onProjectsChange={handleDataChange}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Palette className="h-4 w-4 mr-2" />
                      Manage Projects
                    </DropdownMenuItem>
                  </ProjectManager>
                  <DropdownMenuSeparator />
                  <PersonalSettings onSettingsChange={handleDataChange}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <User className="h-4 w-4 mr-2" />
                      Personal Details
                    </DropdownMenuItem>
                  </PersonalSettings>
                  <CompanySettings onSettingsChange={handleDataChange}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Building2 className="h-4 w-4 mr-2" />
                      Company Settings
                    </DropdownMenuItem>
                  </CompanySettings>
                  <DropdownMenuSeparator />
                  <DataManager onDataChange={handleDataChange}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Database className="h-4 w-4 mr-2" />
                      Data Management
                    </DropdownMenuItem>
                  </DataManager>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === "day" && <DayView selectedDate={selectedDate} onDateChange={setSelectedDate} />}

        {currentView === "week" && (
          <WeekView selectedDate={selectedDate} onDateChange={setSelectedDate} onDayClick={handleDayClick} />
        )}

        {currentView === "month" && (
          <MonthView selectedDate={selectedDate} onDateChange={setSelectedDate} onDayClick={handleDayClick} />
        )}
      </main>
    </div>
  )
}
