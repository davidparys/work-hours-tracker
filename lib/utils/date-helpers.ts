// Date utility functions for time tracking
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDate(dateString: string): Date {
  return new Date(dateString + "T00:00:00")
}

export function getWeekDates(date: Date, weekStartsOn: 'saturday' | 'sunday' | 'monday' = 'sunday'): { start: string; end: string; dates: string[] } {
  const startOfWeek = new Date(date)
  const day = startOfWeek.getDay()
  
  // Map week start options to day numbers (0 = Sunday, 1 = Monday, etc.)
  const weekStartMap = {
    'saturday': 6,
    'sunday': 0,
    'monday': 1
  }
  
  const weekStartDay = weekStartMap[weekStartsOn]
  
  // Calculate the difference, handling the case where we need to go to the previous week
  let diff = day - weekStartDay
  if (diff < 0) {
    diff += 7
  }
  
  // Adjust to start on the specified day
  startOfWeek.setDate(startOfWeek.getDate() - diff)

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

export function getWeekDayHeaders(weekStartsOn: 'saturday' | 'sunday' | 'monday' = 'sunday'): string[] {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  const weekStartMap = {
    'saturday': 6,
    'sunday': 0,
    'monday': 1
  }
  
  const startIndex = weekStartMap[weekStartsOn]
  const headers = []
  
  for (let i = 0; i < 7; i++) {
    const index = (startIndex + i) % 7
    headers.push(dayNames[index])
  }
  
  return headers
}

/**
 * Get the ISO 8601 week number for a given date.
 * Week 1 is the week containing the first Thursday of the year.
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // Set to nearest Thursday: current date + 4 - current day number (make Sunday=7)
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return weekNo
}

/**
 * Get the ISO week year for a given date.
 * This may differ from the calendar year for dates at year boundaries.
 */
export function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  return d.getUTCFullYear()
}

// Re-export from the canonical currency module so existing imports keep working.
export { formatCurrency, getCurrencySymbol, CURRENCY_SYMBOLS } from "@/lib/utils/currency"

/**
 * Format a date range for display (e.g., "Dec 1 - Dec 7" or "Dec 28 - Jan 3")
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })
  const startDay = startDate.getDate()
  const endDay = endDate.getDate()
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`
}

/**
 * Get the month name from a date
 */
export function getMonthName(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
