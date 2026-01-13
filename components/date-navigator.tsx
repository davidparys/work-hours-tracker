"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"

type NavigationMode = "day" | "week" | "month"
type WeekStartDay = "sunday" | "monday" | "saturday"

interface DateNavigatorProps {
  mode: NavigationMode
  selectedDate: Date
  onDateChange: (date: Date) => void
  weekStartsOn?: WeekStartDay
}

// Map week start day names to numeric values for react-day-picker
const weekStartMap: Record<WeekStartDay, 0 | 1 | 6> = {
  sunday: 0,
  monday: 1,
  saturday: 6,
}

export function DateNavigator({
  mode,
  selectedDate,
  onDateChange,
  weekStartsOn = "sunday",
}: DateNavigatorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Get the "today" button label based on mode
  const getTodayLabel = (): string => {
    switch (mode) {
      case "day":
        return "Today"
      case "week":
        return "This Week"
      case "month":
        return "This Month"
    }
  }

  // Navigate to the previous period
  const navigatePrevious = () => {
    const newDate = new Date(selectedDate)
    switch (mode) {
      case "day":
        newDate.setDate(selectedDate.getDate() - 1)
        break
      case "week":
        newDate.setDate(selectedDate.getDate() - 7)
        break
      case "month":
        newDate.setMonth(selectedDate.getMonth() - 1)
        break
    }
    onDateChange(newDate)
  }

  // Navigate to the next period
  const navigateNext = () => {
    const newDate = new Date(selectedDate)
    switch (mode) {
      case "day":
        newDate.setDate(selectedDate.getDate() + 1)
        break
      case "week":
        newDate.setDate(selectedDate.getDate() + 7)
        break
      case "month":
        newDate.setMonth(selectedDate.getMonth() + 1)
        break
    }
    onDateChange(newDate)
  }

  // Navigate to today/this week/this month
  const navigateToToday = () => {
    onDateChange(new Date())
  }

  // Handle calendar date selection
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date)
      setIsCalendarOpen(false)
    }
  }

  // Get calendar props based on mode
  const getCalendarProps = () => {
    const baseProps = {
      mode: "single" as const,
      selected: selectedDate,
      onSelect: handleCalendarSelect,
      weekStartsOn: weekStartMap[weekStartsOn],
      defaultMonth: selectedDate,
    }

    // For month mode, show dropdown for quick month/year navigation
    if (mode === "month") {
      return {
        ...baseProps,
        captionLayout: "dropdown" as const,
        fromYear: 2020,
        toYear: new Date().getFullYear() + 5,
      }
    }

    return baseProps
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={navigatePrevious}>
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      
      <Button variant="outline" size="sm" onClick={navigateToToday}>
        {getTodayLabel()}
      </Button>
      
      <Button variant="outline" size="sm" onClick={navigateNext}>
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="sr-only">Pick a date</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar {...getCalendarProps()} />
        </PopoverContent>
      </Popover>
    </div>
  )
}









