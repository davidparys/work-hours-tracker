// Date utility functions for time tracking
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function parseDate(dateString: string): Date {
  return new Date(dateString + "T00:00:00")
}

export function getWeekDates(date: Date): { start: string; end: string; dates: string[] } {
  const startOfWeek = new Date(date)
  const day = startOfWeek.getDay()
  const diff = startOfWeek.getDate() - day // Adjust to start on Sunday
  startOfWeek.setDate(diff)

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startOfWeek)
    currentDate.setDate(startOfWeek.getDate() + i)
    dates.push(formatDate(currentDate))
  }

  return {
    start: dates[0],
    end: dates[6],
    dates,
  }
}

export function getMonthDates(date: Date): { start: string; end: string; dates: string[] } {
  const year = date.getFullYear()
  const month = date.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const dates: string[] = []
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const currentDate = new Date(year, month, day)
    dates.push(formatDate(currentDate))
  }

  return {
    start: formatDate(firstDay),
    end: formatDate(lastDay),
    dates,
  }
}

export function getActivityLevel(hours: number): "none" | "low" | "medium" | "high" {
  if (hours === 0) return "none"
  if (hours < 2) return "low"
  if (hours < 6) return "medium"
  return "high"
}

export function formatHours(hours: number): string {
  if (hours === 0) return "0h"
  if (hours < 1) return `${Math.round(hours * 60)}m`

  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)

  if (minutes === 0) return `${wholeHours}h`
  return `${wholeHours}h ${minutes}m`
}
