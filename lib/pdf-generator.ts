// PDF generation utilities for time tracking reports
import type { TimeEntry, Project } from "./database"
import { formatHours, getWeekDates, formatDate, getWeekDayHeaders, getISOWeekNumber, formatCurrency, formatDateRange, getMonthName } from "./utils/date-helpers"
import jsPDF from 'jspdf'

export interface PDFExportOptions {
  startDate: string
  endDate: string
  entries: TimeEntry[]
  projects: Project[]
  style: "professional" | "visual"
  includeActivityGrid?: boolean
  showProjects?: boolean
  weekStartsOn?: 'saturday' | 'sunday' | 'monday'
  currency?: string
  userSettings?: {
    firstName: string
    lastName: string
  }
  companySettings?: {
    companyName: string
    timezone: string
  }
}

export class PDFGenerator {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin: number
  private currentY: number

  constructor() {
    this.doc = new jsPDF()
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.margin = 20
    this.currentY = this.margin
  }

  async generatePDF(options: PDFExportOptions): Promise<Blob> {
    this.setupDocument()

    if (options.style === "professional") {
      await this.generateProfessionalReport(options)
    } else {
      await this.generateVisualReport(options)
    }

    return this.doc.output('blob')
  }

  private setupDocument() {
    this.doc.setFillColor(255, 255, 255)
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight, 'F')
    this.currentY = this.margin
  }

  private async generateProfessionalReport(options: PDFExportOptions) {
    // Header
    this.doc.setFontSize(24)
    this.doc.setTextColor(22, 78, 99) // #164e63
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('TIME TRACKING REPORT', this.margin, this.currentY)
    this.currentY += 20

    // User and Company Information
    if (options.userSettings || options.companySettings) {
      this.doc.setFontSize(12)
      this.doc.setTextColor(71, 85, 105) // #475569
      this.doc.setFont('helvetica', 'normal')

      // User name
      if (options.userSettings?.firstName || options.userSettings?.lastName) {
        const fullName = `${options.userSettings.firstName || ''} ${options.userSettings.lastName || ''}`.trim()
        if (fullName) {
          this.doc.text(`Employee: ${fullName}`, this.margin, this.currentY)
          this.currentY += 12
        }
      }

      // Company name
      if (options.companySettings?.companyName) {
        this.doc.text(`Company: ${options.companySettings.companyName}`, this.margin, this.currentY)
        this.currentY += 12
      }

      this.currentY += 8
    }

    // Date range
    const startDate = new Date(options.startDate + "T00:00:00")
    const endDate = new Date(options.endDate + "T00:00:00")
    this.doc.setFontSize(14)
    this.doc.setTextColor(71, 85, 105) // #475569
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(
      `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      this.margin,
      this.currentY
    )
    this.currentY += 25

    // Get week dates for the selected period
    const weekDates = this.getWeekDatesInRange(options.startDate, options.endDate, options.weekStartsOn || 'sunday')
    const isMultiWeek = weekDates.length > 1

    // Summary statistics
    const totalHours = options.entries.reduce((sum, entry) => sum + entry.duration, 0)
    const workingDays = new Set(options.entries.map((e) => e.date)).size
    const avgHoursPerDay = workingDays > 0 ? totalHours / workingDays : 0

    // Check if we need a new page before summary
    if (this.currentY > this.pageHeight - 100) {
      this.doc.addPage()
      this.currentY = this.margin
    }

    this.doc.setFontSize(16)
    this.doc.setTextColor(22, 78, 99)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('SUMMARY', this.margin, this.currentY)
    this.currentY += 15

    this.doc.setFontSize(12)
    this.doc.setTextColor(71, 85, 105)
    this.doc.setFont('helvetica', 'normal')

    const summaryData = [
      ["Total Hours:", formatHours(totalHours)],
      ["Working Days:", workingDays.toString()],
      ["Average Hours/Day:", formatHours(avgHoursPerDay)],
      ["Total Entries:", options.entries.length.toString()],
    ]

    summaryData.forEach(([label, value]) => {
      this.doc.text(label, this.margin, this.currentY)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(value, this.margin + 80, this.currentY)
      this.doc.setFont('helvetica', 'normal')
      this.currentY += 12
    })

    this.currentY += 15

    // Weekly/Monthly breakdown - only show if showProjects is enabled
    if (options.showProjects) {
      // Check if we need a new page before breakdown
      if (this.currentY > this.pageHeight - 100) {
        this.doc.addPage()
        this.currentY = this.margin
      }

      if (isMultiWeek) {
        // Monthly view for multi-week periods
        this.doc.setFontSize(16)
        this.doc.setTextColor(22, 78, 99)
        this.doc.setFont('helvetica', 'bold')
        this.doc.text('MONTHLY OVERVIEW', this.margin, this.currentY)
        this.currentY += 20

        // Create monthly calendar grid
        this.generateMonthlyView(weekDates, options)
      } else {
        // Single week detailed view
        this.doc.setFontSize(16)
        this.doc.setTextColor(22, 78, 99)
        this.doc.setFont('helvetica', 'bold')
        this.doc.text('WEEKLY BREAKDOWN', this.margin, this.currentY)
        this.currentY += 20

        // Process single week
        const week = weekDates[0]
        const weekEntries = options.entries.filter(entry =>
          entry.date >= week.start && entry.date <= week.end
        )

        if (weekEntries.length > 0) {
          const weekTotalHours = weekEntries.reduce((sum, entry) => sum + entry.duration, 0)
          const weekStartDate = new Date(week.start + "T00:00:00")
          const weekEndDate = new Date(week.end + "T00:00:00")

          // Week header
          this.doc.setFontSize(14)
          this.doc.setTextColor(22, 78, 99)
          this.doc.setFont('helvetica', 'bold')
          this.doc.text(
            `Week of ${weekStartDate.toLocaleDateString()} - ${weekEndDate.toLocaleDateString()}`,
            this.margin,
            this.currentY
          )
          this.currentY += 12

          this.doc.setFontSize(12)
          this.doc.setTextColor(71, 85, 105)
          this.doc.setFont('helvetica', 'normal')
          this.doc.text(`Total: ${formatHours(weekTotalHours)}`, this.margin + 10, this.currentY)
          this.currentY += 15

          // Daily breakdown
          const dailyHours = this.calculateDailyHours(weekEntries)
          const dayNames = getWeekDayHeaders(options.weekStartsOn || 'sunday')

          for (const date of week.dates) {
            // Check if we need a new page before each day
            if (this.currentY > this.pageHeight - 80) {
              this.doc.addPage()
              this.currentY = this.margin
            }

            const dayDate = new Date(date + "T00:00:00")
            const dayName = dayNames[week.dates.indexOf(date)]
            const hours = dailyHours[date] || 0

            if (hours > 0) {
              this.doc.text(`${dayName} ${dayDate.getDate()}:`, this.margin + 20, this.currentY)
              this.doc.setFont('helvetica', 'bold')
              this.doc.text(formatHours(hours), this.margin + 60, this.currentY)
              this.doc.setFont('helvetica', 'normal')

              // Show project breakdown if enabled
              if (options.showProjects) {
                const dayEntries = weekEntries.filter(entry => entry.date === date)
                const projectBreakdown = this.calculateProjectHours(dayEntries)

                Object.entries(projectBreakdown).forEach(([project, projectHours]) => {
                  this.currentY += 10
                  // Check if we need a new page for project items
                  if (this.currentY > this.pageHeight - 40) {
                    this.doc.addPage()
                    this.currentY = this.margin
                  }
                  this.doc.setFontSize(10)
                  this.doc.setTextColor(107, 114, 128) // #6b7280
                  this.doc.text(`  • ${project}: ${formatHours(projectHours)}`, this.margin + 30, this.currentY)
                })
                this.doc.setFontSize(12)
                this.doc.setTextColor(71, 85, 105)
              }

              this.currentY += 15
            }
          }

          this.currentY += 10
        }
      }
    }

    // Project summary
    const projectHours = this.calculateProjectHours(options.entries)
    if (Object.keys(projectHours).length > 0) {
      this.currentY += 10

      // Check if we need a new page before project summary
      if (this.currentY > this.pageHeight - 100) {
        this.doc.addPage()
        this.currentY = this.margin
      }

      this.doc.setFontSize(16)
      this.doc.setTextColor(22, 78, 99)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text('PROJECT SUMMARY', this.margin, this.currentY)
      this.currentY += 20

      Object.entries(projectHours).forEach(([project, hours]) => {
        // Check if we need a new page for each project
        if (this.currentY > this.pageHeight - 40) {
          this.doc.addPage()
          this.currentY = this.margin
        }

        const percentage = ((hours / totalHours) * 100).toFixed(1)
        this.doc.setFontSize(12)
        this.doc.setTextColor(71, 85, 105)
        this.doc.setFont('helvetica', 'normal')
        this.doc.text(project || "Unassigned", this.margin, this.currentY)
        this.doc.setFont('helvetica', 'bold')
        this.doc.text(`${formatHours(hours)} (${percentage}%)`, this.margin + 120, this.currentY)
        this.currentY += 15
      })
    }

    // Footer
    this.doc.setFontSize(8)
    this.doc.setTextColor(156, 163, 175) // #9ca3af
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(
      `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      this.margin,
      this.pageHeight - 20
    )
  }

  private async generateVisualReport(options: PDFExportOptions) {
    const currency = options.currency || 'USD'

    // Header with professional styling
    this.doc.setFillColor(22, 78, 99) // #164e63
    this.doc.rect(0, 0, this.pageWidth, 50, 'F')

    this.doc.setFontSize(22)
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('TIME TRACKING REPORT', this.margin, 30)

    this.doc.setFontSize(11)
    this.doc.setTextColor(236, 254, 255) // #ecfeff
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Weekly Breakdown Summary', this.margin, 42)

    this.currentY = 65

    // User and Company Information - compact layout
    const startDate = new Date(options.startDate + "T00:00:00")
    const endDate = new Date(options.endDate + "T00:00:00")

    this.doc.setFontSize(10)
    this.doc.setTextColor(71, 85, 105) // #475569
    this.doc.setFont('helvetica', 'normal')

    let infoX = this.margin
    if (options.userSettings?.firstName || options.userSettings?.lastName) {
      const fullName = `${options.userSettings.firstName || ''} ${options.userSettings.lastName || ''}`.trim()
      if (fullName) {
        this.doc.text(`Employee: ${fullName}`, infoX, this.currentY)
        infoX += 90
      }
    }

    if (options.companySettings?.companyName) {
      this.doc.text(`Company: ${options.companySettings.companyName}`, infoX, this.currentY)
    }

    this.currentY += 8
    this.doc.text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, this.margin, this.currentY)
    this.currentY += 15

    // Calculate all statistics
    const totalHours = options.entries.reduce((sum, entry) => sum + entry.duration, 0)
    const totalBillable = options.entries.reduce((sum, entry) => {
      const rate = entry.billableRate || 0
      return sum + (entry.duration * rate)
    }, 0)
    const workingDays = new Set(options.entries.map((e) => e.date)).size
    const avgHoursPerDay = workingDays > 0 ? totalHours / workingDays : 0

    // Executive Summary Box
    this.doc.setFillColor(248, 250, 252) // #f8fafc
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 45, 'F')
    this.doc.setDrawColor(226, 232, 240) // #e2e8f0
    this.doc.setLineWidth(0.5)
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 45, 'S')

    const boxPadding = 8
    const boxY = this.currentY + boxPadding
    const colWidth = (this.pageWidth - 2 * this.margin) / 4

    // Summary metrics
    const summaryMetrics = [
      { label: 'Total Hours', value: formatHours(totalHours) },
      { label: 'Total Billable', value: formatCurrency(totalBillable, currency) },
      { label: 'Working Days', value: workingDays.toString() },
      { label: 'Avg Hours/Day', value: formatHours(avgHoursPerDay) },
    ]

    summaryMetrics.forEach((metric, index) => {
      const x = this.margin + (index * colWidth) + colWidth / 2

      this.doc.setFontSize(16)
      this.doc.setTextColor(22, 78, 99)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(metric.value, x, boxY + 12, { align: 'center' })

      this.doc.setFontSize(9)
      this.doc.setTextColor(107, 114, 128)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text(metric.label, x, boxY + 24, { align: 'center' })
    })

    this.currentY += 55

    // Get week data organized by month
    const weekDates = this.getWeekDatesInRange(options.startDate, options.endDate, options.weekStartsOn || 'sunday')
    const weeksByMonth = this.groupWeeksByMonth(weekDates, options.entries)

    // Weekly Breakdown Section
    this.doc.setFontSize(14)
    this.doc.setTextColor(22, 78, 99)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('WEEKLY BREAKDOWN', this.margin, this.currentY)
    this.currentY += 12

    // Process each month
    for (const [monthKey, monthData] of Object.entries(weeksByMonth)) {
      // Check if we need a new page
      if (this.currentY > this.pageHeight - 100) {
        this.doc.addPage()
        this.currentY = this.margin
      }

      // Month header
      this.doc.setFillColor(22, 78, 99) // #164e63
      this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 20, 'F')

      this.doc.setFontSize(12)
      this.doc.setTextColor(255, 255, 255)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(monthData.monthName, this.margin + 8, this.currentY + 13)

      // Month totals on the right
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      const monthSummary = `${formatHours(monthData.totalHours)} | ${formatCurrency(monthData.totalBillable, currency)}`
      this.doc.text(monthSummary, this.pageWidth - this.margin - 8, this.currentY + 13, { align: 'right' })

      this.currentY += 25

      // Week rows for this month
      for (const week of monthData.weeks) {
        if (this.currentY > this.pageHeight - 60) {
          this.doc.addPage()
          this.currentY = this.margin
        }

        // Week row background
        this.doc.setFillColor(248, 250, 252) // #f8fafc
        this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 18, 'F')
        this.doc.setDrawColor(226, 232, 240)
        this.doc.setLineWidth(0.3)
        this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 18, 'S')

        // Week number and date range
        this.doc.setFontSize(10)
        this.doc.setTextColor(51, 65, 85) // #334155
        this.doc.setFont('helvetica', 'bold')
        this.doc.text(`Week ${week.weekNumber}`, this.margin + 8, this.currentY + 12)

        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(107, 114, 128) // #6b7280
        this.doc.text(`(${week.dateRange})`, this.margin + 50, this.currentY + 12)

        // Hours and billable on the right
        this.doc.setTextColor(51, 65, 85)
        this.doc.setFont('helvetica', 'bold')
        const weekSummary = `${formatHours(week.hours)} | ${formatCurrency(week.billable, currency)}`
        this.doc.text(weekSummary, this.pageWidth - this.margin - 8, this.currentY + 12, { align: 'right' })

        this.currentY += 20

        // Project breakdown for this week if enabled
        if (options.showProjects && Object.keys(week.projectBreakdown).length > 0) {
          for (const [project, data] of Object.entries(week.projectBreakdown)) {
            const projectColor = options.projects.find(p => p.name === project)?.color || "#6b7280"
            const rgb = this.hexToRgb(projectColor)

            // Project color indicator
            if (rgb) {
              this.doc.setFillColor(rgb.r, rgb.g, rgb.b)
              this.doc.circle(this.margin + 20, this.currentY + 2, 3, 'F')
            }

            this.doc.setFontSize(9)
            this.doc.setTextColor(107, 114, 128)
            this.doc.setFont('helvetica', 'normal')
            this.doc.text(project || "Unassigned", this.margin + 28, this.currentY + 5)

            const projectSummary = `${formatHours(data.hours)} | ${formatCurrency(data.billable, currency)}`
            this.doc.text(projectSummary, this.pageWidth - this.margin - 8, this.currentY + 5, { align: 'right' })

            this.currentY += 12
          }
          this.currentY += 3
        }
      }

      this.currentY += 8
    }

    // Project Distribution Section
    const projectHours = this.calculateProjectHoursWithBillable(options.entries)
    if (Object.keys(projectHours).length > 0) {
      if (this.currentY > this.pageHeight - 100) {
        this.doc.addPage()
        this.currentY = this.margin
      }

      this.doc.setFontSize(14)
      this.doc.setTextColor(22, 78, 99)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text('PROJECT DISTRIBUTION', this.margin, this.currentY)
      this.currentY += 15

      // Table header
      this.doc.setFillColor(241, 245, 249) // #f1f5f9
      this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 14, 'F')

      this.doc.setFontSize(9)
      this.doc.setTextColor(71, 85, 105)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text('Project', this.margin + 20, this.currentY + 10)
      this.doc.text('Hours', this.margin + 100, this.currentY + 10)
      this.doc.text('Billable', this.margin + 135, this.currentY + 10)
      this.doc.text('%', this.pageWidth - this.margin - 15, this.currentY + 10, { align: 'right' })

      this.currentY += 18

      Object.entries(projectHours).forEach(([project, data]) => {
        const percentage = ((data.hours / totalHours) * 100).toFixed(1)
        const projectColor = options.projects.find(p => p.name === project)?.color || "#6b7280"
        const rgb = this.hexToRgb(projectColor)

        // Color indicator
        if (rgb) {
          this.doc.setFillColor(rgb.r, rgb.g, rgb.b)
          this.doc.rect(this.margin + 4, this.currentY - 6, 10, 10, 'F')
        }

        this.doc.setFontSize(10)
        this.doc.setTextColor(51, 65, 85)
        this.doc.setFont('helvetica', 'normal')
        this.doc.text(project || "Unassigned", this.margin + 20, this.currentY)
        this.doc.text(formatHours(data.hours), this.margin + 100, this.currentY)
        this.doc.text(formatCurrency(data.billable, currency), this.margin + 135, this.currentY)

        this.doc.setFont('helvetica', 'bold')
        this.doc.text(`${percentage}%`, this.pageWidth - this.margin - 15, this.currentY, { align: 'right' })

        // Progress bar
        const barWidth = 40
        const barHeight = 4
        const barX = this.pageWidth - this.margin - 60
        const barY = this.currentY - 3
        const fillWidth = (parseFloat(percentage) / 100) * barWidth

        this.doc.setFillColor(226, 232, 240) // #e2e8f0
        this.doc.rect(barX, barY, barWidth, barHeight, 'F')

        if (rgb) {
          this.doc.setFillColor(rgb.r, rgb.g, rgb.b)
          this.doc.rect(barX, barY, fillWidth, barHeight, 'F')
        }

        this.currentY += 16
      })
    }

    // Footer
    this.doc.setFontSize(8)
    this.doc.setTextColor(156, 163, 175)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(
      `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      this.margin,
      this.pageHeight - 15
    )
  }

  private groupWeeksByMonth(
    weekDates: Array<{ start: string; end: string; dates: string[] }>,
    entries: TimeEntry[]
  ): Record<string, {
    monthName: string;
    totalHours: number;
    totalBillable: number;
    weeks: Array<{
      weekNumber: number;
      dateRange: string;
      hours: number;
      billable: number;
      projectBreakdown: Record<string, { hours: number; billable: number }>;
    }>
  }> {
    const result: Record<string, {
      monthName: string;
      totalHours: number;
      totalBillable: number;
      weeks: Array<{
        weekNumber: number;
        dateRange: string;
        hours: number;
        billable: number;
        projectBreakdown: Record<string, { hours: number; billable: number }>;
      }>
    }> = {}

    for (const week of weekDates) {
      const weekStartDate = new Date(week.start + "T00:00:00")
      const weekEndDate = new Date(week.end + "T00:00:00")
      const monthKey = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, '0')}`
      const monthName = getMonthName(weekStartDate)

      // Get entries for this week
      const weekEntries = entries.filter(entry =>
        entry.date >= week.start && entry.date <= week.end
      )

      const weekHours = weekEntries.reduce((sum, entry) => sum + entry.duration, 0)
      const weekBillable = weekEntries.reduce((sum, entry) => {
        const rate = entry.billableRate || 0
        return sum + (entry.duration * rate)
      }, 0)

      // Calculate project breakdown for this week
      const projectBreakdown: Record<string, { hours: number; billable: number }> = {}
      weekEntries.forEach(entry => {
        const projectName = entry.project || 'Unassigned'
        if (!projectBreakdown[projectName]) {
          projectBreakdown[projectName] = { hours: 0, billable: 0 }
        }
        projectBreakdown[projectName].hours += entry.duration
        projectBreakdown[projectName].billable += entry.duration * (entry.billableRate || 0)
      })

      // Initialize month if not exists
      if (!result[monthKey]) {
        result[monthKey] = {
          monthName,
          totalHours: 0,
          totalBillable: 0,
          weeks: []
        }
      }

      result[monthKey].totalHours += weekHours
      result[monthKey].totalBillable += weekBillable
      result[monthKey].weeks.push({
        weekNumber: getISOWeekNumber(weekStartDate),
        dateRange: formatDateRange(weekStartDate, weekEndDate),
        hours: weekHours,
        billable: weekBillable,
        projectBreakdown
      })
    }

    return result
  }

  private calculateProjectHoursWithBillable(entries: TimeEntry[]): Record<string, { hours: number; billable: number }> {
    const result: Record<string, { hours: number; billable: number }> = {}

    entries.forEach((entry) => {
      const project = entry.project || "Unassigned"
      if (!result[project]) {
        result[project] = { hours: 0, billable: 0 }
      }
      result[project].hours += entry.duration
      result[project].billable += entry.duration * (entry.billableRate || 0)
    })

    return result
  }

  private getWeekDatesInRange(startDate: string, endDate: string, weekStartsOn: 'saturday' | 'sunday' | 'monday' = 'sunday'): Array<{ start: string; end: string; dates: string[] }> {
    const weeks: Array<{ start: string; end: string; dates: string[] }> = []
    const start = new Date(startDate + "T00:00:00")
    const end = new Date(endDate + "T00:00:00")

    let currentDate = new Date(start)

    while (currentDate <= end) {
      const week = getWeekDates(currentDate, weekStartsOn)
      weeks.push(week)

      // Advance to the day after this week's end so we don't skip weeks.
      // Using currentDate + 7 is wrong when getWeekDates snapped back to
      // an earlier start day (e.g. the preceding Monday), which would cause
      // the next +7 jump to land mid-week and miss the following week row.
      currentDate = new Date(week.end + "T00:00:00")
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return weeks
  }

  private generateMonthlyView(weekDates: Array<{ start: string; end: string; dates: string[] }>, options: PDFExportOptions) {
    // Check if we need a new page before starting monthly view
    if (this.currentY > this.pageHeight - 150) {
      this.doc.addPage()
      this.currentY = this.margin
    }

    const dayNames = getWeekDayHeaders(options.weekStartsOn || 'sunday')
    // Fit 7 day columns within the full printable width (pageWidth - 2*margin)
    const printableWidth = this.pageWidth - 2 * this.margin
    const cellWidth = Math.floor(printableWidth / 7)
    const cellHeight = 20
    const startX = this.margin
    const startY = this.currentY

    // Draw calendar header
    this.doc.setFontSize(10)
    this.doc.setTextColor(71, 85, 105)
    this.doc.setFont('helvetica', 'bold')

    // Day headers
    for (let i = 0; i < 7; i++) {
      const x = startX + (i * cellWidth)
      this.doc.text(dayNames[i], x + 5, startY)
    }

    this.currentY = startY + 15

    // Draw each week as a row
    for (let weekIndex = 0; weekIndex < weekDates.length; weekIndex++) {
      const week = weekDates[weekIndex]
      // Clamp to the selected date range so entries from adjacent weeks
      // that fall outside the user's chosen period are not counted
      const effectiveStart = week.start < options.startDate ? options.startDate : week.start
      const effectiveEnd = week.end > options.endDate ? options.endDate : week.end
      const weekEntries = options.entries.filter(entry =>
        entry.date >= effectiveStart && entry.date <= effectiveEnd
      )

      const weekTotalHours = weekEntries.reduce((sum, entry) => sum + entry.duration, 0)
      const dailyHours = this.calculateDailyHours(weekEntries)

      // Week background
      this.doc.setFillColor(248, 250, 252) // #f8fafc
      this.doc.rect(startX, this.currentY - 5, cellWidth * 7, cellHeight, 'F')

      // Week border
      this.doc.setDrawColor(226, 232, 240) // #e2e8f0
      this.doc.setLineWidth(0.5)
      this.doc.rect(startX, this.currentY - 5, cellWidth * 7, cellHeight, 'S')

      // Draw each day in the week
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const date = week.dates[dayIndex]
        const x = startX + (dayIndex * cellWidth)
        const dayDate = new Date(date + "T00:00:00")
        const hours = dailyHours[date] || 0

        // Day cell border
        this.doc.setDrawColor(226, 232, 240)
        this.doc.rect(x, this.currentY - 5, cellWidth, cellHeight, 'S')

        // Day number
        this.doc.setFontSize(8)
        this.doc.setTextColor(71, 85, 105)
        this.doc.setFont('helvetica', 'normal')
        this.doc.text(dayDate.getDate().toString(), x + 2, this.currentY + 2)

        // Hours if any
        if (hours > 0) {
          this.doc.setFontSize(7)
          this.doc.setTextColor(16, 185, 129) // #10b981
          this.doc.setFont('helvetica', 'bold')
          this.doc.text(formatHours(hours), x + 2, this.currentY + 10)

          // Activity intensity indicator
          const intensity = Math.min(hours / 8, 1)
          const color = this.getActivityColor(intensity)
          this.doc.setFillColor(color.r, color.g, color.b)
          this.doc.circle(x + cellWidth - 6, this.currentY + 3, 2, 'F')
        }
      }

      // Week total — rendered inside the row, right-aligned within the grid
      this.doc.setFontSize(7)
      this.doc.setTextColor(22, 78, 99)
      this.doc.setFont('helvetica', 'bold')
      const weekLabel = `W${getISOWeekNumber(new Date(week.start + "T00:00:00"))}: ${formatHours(weekTotalHours)}`
      this.doc.text(weekLabel, startX + (cellWidth * 7) - 2, this.currentY + 8, { align: 'right' })

      this.currentY += cellHeight + 5

      // Show project breakdown for this week if enabled
      if (options.showProjects && weekEntries.length > 0) {
        const projectBreakdown = this.calculateProjectHours(weekEntries)
        if (Object.keys(projectBreakdown).length > 0) {
          this.currentY += 5
          Object.entries(projectBreakdown).forEach(([project, projectHours]) => {
            // Check if we need a new page for project items
            if (this.currentY > this.pageHeight - 40) {
              this.doc.addPage()
              this.currentY = this.margin
            }
            this.doc.setFontSize(8)
            this.doc.setTextColor(107, 114, 128) // #6b7280
            this.doc.setFont('helvetica', 'normal')
            this.doc.text(`  • ${project}: ${formatHours(projectHours)}`, startX + 10, this.currentY)
            this.currentY += 10
          })
          this.currentY += 5
        }
      }

      // Check if we need a new page
      if (this.currentY > this.pageHeight - 80) {
        this.doc.addPage()
        this.currentY = this.margin

        // Redraw calendar header on new page
        this.doc.setFontSize(10)
        this.doc.setTextColor(71, 85, 105)
        this.doc.setFont('helvetica', 'bold')
        for (let i = 0; i < 7; i++) {
          const x = startX + (i * cellWidth)
          this.doc.text(dayNames[i], x + 5, this.currentY)
        }
        this.currentY += 15
      }
    }

    this.currentY += 15
  }

  private calculateProjectHours(entries: TimeEntry[]): { [project: string]: number } {
    const projectHours: { [project: string]: number } = {}

    entries.forEach((entry) => {
      const project = entry.project || "Unassigned"
      projectHours[project] = (projectHours[project] || 0) + entry.duration
    })

    return projectHours
  }

  private calculateDailyHours(entries: TimeEntry[]): { [date: string]: number } {
    const dailyHours: { [date: string]: number } = {}

    entries.forEach((entry) => {
      dailyHours[entry.date] = (dailyHours[entry.date] || 0) + entry.duration
    })

    return dailyHours
  }

  private getActivityColor(intensity: number): { r: number; g: number; b: number } {
    if (intensity === 0) return { r: 241, g: 245, b: 249 } // #f1f5f9
    if (intensity < 0.25) return { r: 167, g: 243, b: 208 } // #a7f3d0
    if (intensity < 0.5) return { r: 110, g: 231, b: 183 } // #6ee7b7
    if (intensity < 0.75) return { r: 52, g: 211, b: 153 } // #34d399
    return { r: 16, g: 185, b: 129 } // #10b981
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }
}

// Export functions
export async function exportToPDF(options: PDFExportOptions): Promise<void> {
  const generator = new PDFGenerator()
  const pdfBlob = await generator.generatePDF(options)

  // Create download link
  const url = URL.createObjectURL(pdfBlob)
  const link = document.createElement("a")
  link.href = url

  // Generate filename with user name if available
  let filename = `time-report-${options.startDate}-to-${options.endDate}-${options.style}`
  if (options.userSettings?.firstName || options.userSettings?.lastName) {
    const fullName = `${options.userSettings.firstName || ''} ${options.userSettings.lastName || ''}`.trim()
    if (fullName) {
      filename = `${fullName.replace(/\s+/g, '-')}-time-report-${options.startDate}-to-${options.endDate}-${options.style}`
    }
  }

  link.download = `${filename}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}