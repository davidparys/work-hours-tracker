// PDF generation utilities for time tracking reports
import type { TimeEntry, Project } from "./database"
import { formatHours, getWeekDates, formatDate, getWeekDayHeaders } from "./utils/date-helpers"
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
      this.doc.setFontSize(16)
      this.doc.setTextColor(22, 78, 99)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text('PROJECT SUMMARY', this.margin, this.currentY)
      this.currentY += 20

      Object.entries(projectHours).forEach(([project, hours]) => {
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
    // Header with visual styling
    this.doc.setFillColor(22, 78, 99) // #164e63
    this.doc.rect(0, 0, this.pageWidth, 60, 'F')

    this.doc.setFontSize(24)
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('TIME TRACKING REPORT', this.margin, 35)

    this.doc.setFontSize(14)
    this.doc.setTextColor(236, 254, 255) // #ecfeff
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Visual Activity Overview', this.margin, 50)

    this.currentY = 80

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

    // Date range with background
    this.doc.setFillColor(236, 254, 255) // #ecfeff
    this.doc.rect(this.margin - 5, this.currentY - 5, this.pageWidth - 2 * this.margin + 10, 25, 'F')

    const startDate = new Date(options.startDate + "T00:00:00")
    const endDate = new Date(options.endDate + "T00:00:00")
    this.doc.setFontSize(16)
    this.doc.setTextColor(22, 78, 99)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(
      `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      this.margin,
      this.currentY + 10
    )
    this.currentY += 40

    // Get week dates for the selected period
    const weekDates = this.getWeekDatesInRange(options.startDate, options.endDate, options.weekStartsOn || 'sunday')
    const isMultiWeek = weekDates.length > 1
    
    // Summary with visual elements
    const totalHours = options.entries.reduce((sum, entry) => sum + entry.duration, 0)
    const workingDays = new Set(options.entries.map((e) => e.date)).size

    // Large total hours display
    this.doc.setFontSize(36)
    this.doc.setTextColor(16, 185, 129) // #10b981
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(formatHours(totalHours), this.margin, this.currentY)
    
    this.doc.setFontSize(14)
    this.doc.setTextColor(71, 85, 105)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Total Hours Tracked', this.margin, this.currentY + 15)

    this.currentY += 50

    // Weekly/Monthly breakdown with visual elements - only show if showProjects is enabled
    if (options.showProjects) {
      if (isMultiWeek) {
        // Monthly view for multi-week periods
        this.doc.setFontSize(18)
        this.doc.setTextColor(22, 78, 99)
        this.doc.setFont('helvetica', 'bold')
        this.doc.text('Monthly Calendar View', this.margin, this.currentY)
        this.currentY += 25

        // Create visual monthly calendar grid
        this.generateVisualMonthlyView(weekDates, options)
      } else {
        // Single week detailed view
        this.doc.setFontSize(18)
        this.doc.setTextColor(22, 78, 99)
        this.doc.setFont('helvetica', 'bold')
        this.doc.text('Weekly Overview', this.margin, this.currentY)
        this.currentY += 25

        // Process single week
        const week = weekDates[0]
        const weekEntries = options.entries.filter(entry => 
          entry.date >= week.start && entry.date <= week.end
        )
        
        if (weekEntries.length > 0) {
          const weekTotalHours = weekEntries.reduce((sum, entry) => sum + entry.duration, 0)
          const weekStartDate = new Date(week.start + "T00:00:00")
          const weekEndDate = new Date(week.end + "T00:00:00")

          // Week header with background
          this.doc.setFillColor(241, 245, 249) // #f1f5f9
          this.doc.rect(this.margin - 5, this.currentY - 5, this.pageWidth - 2 * this.margin + 10, 20, 'F')

          this.doc.setFontSize(14)
          this.doc.setTextColor(22, 78, 99)
          this.doc.setFont('helvetica', 'bold')
          this.doc.text(
            `Week of ${weekStartDate.toLocaleDateString()} - ${weekEndDate.toLocaleDateString()}`,
            this.margin,
            this.currentY + 8
          )
          
          this.doc.setFontSize(12)
          this.doc.setTextColor(16, 185, 129)
          this.doc.setFont('helvetica', 'bold')
          this.doc.text(formatHours(weekTotalHours), this.pageWidth - this.margin - 50, this.currentY + 8)
          
          this.currentY += 25

          // Daily breakdown with visual indicators
          const dailyHours = this.calculateDailyHours(weekEntries)
          const dayNames = getWeekDayHeaders(options.weekStartsOn || 'sunday')
          
          for (const date of week.dates) {
            const dayDate = new Date(date + "T00:00:00")
            const dayName = dayNames[week.dates.indexOf(date)]
            const hours = dailyHours[date] || 0
            
            if (hours > 0) {
              // Activity indicator
              const intensity = Math.min(hours / 8, 1)
              const color = this.getActivityColor(intensity)
              this.doc.setFillColor(color.r, color.g, color.b)
              this.doc.circle(this.margin + 15, this.currentY - 2, 3, 'F')
              
              this.doc.setFontSize(12)
              this.doc.setTextColor(71, 85, 105)
              this.doc.setFont('helvetica', 'normal')
              this.doc.text(`${dayName} ${dayDate.getDate()}:`, this.margin + 25, this.currentY)
              
              this.doc.setFont('helvetica', 'bold')
              this.doc.setTextColor(16, 185, 129)
              this.doc.text(formatHours(hours), this.margin + 80, this.currentY)
              
              // Show project breakdown if enabled
              if (options.showProjects) {
                const dayEntries = weekEntries.filter(entry => entry.date === date)
                const projectBreakdown = this.calculateProjectHours(dayEntries)
                
                Object.entries(projectBreakdown).forEach(([project, projectHours]) => {
                  this.currentY += 10
                  this.doc.setFontSize(10)
                  this.doc.setTextColor(107, 114, 128)
                  this.doc.setFont('helvetica', 'normal')
                  
                  // Project color indicator
                  const projectColor = options.projects.find(p => p.name === project)?.color || "#6b7280"
                  const rgb = this.hexToRgb(projectColor)
                  if (rgb) {
                    this.doc.setFillColor(rgb.r, rgb.g, rgb.b)
                    this.doc.circle(this.margin + 35, this.currentY - 2, 2, 'F')
                  }
                  
                  this.doc.text(`  ${project}: ${formatHours(projectHours)}`, this.margin + 45, this.currentY)
                })
                this.doc.setFontSize(12)
                this.doc.setTextColor(71, 85, 105)
              }
              
              this.currentY += 15
            }
          }

          this.currentY += 15
        }
      }
    }

    // Project summary with colors
    const projectHours = this.calculateProjectHours(options.entries)
    if (Object.keys(projectHours).length > 0) {
      this.currentY += 10
      this.doc.setFontSize(18)
      this.doc.setTextColor(22, 78, 99)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text('Project Distribution', this.margin, this.currentY)
      this.currentY += 25

      Object.entries(projectHours).forEach(([project, hours]) => {
        const percentage = ((hours / totalHours) * 100).toFixed(1)
        const projectColor = options.projects.find(p => p.name === project)?.color || "#6b7280"
        const rgb = this.hexToRgb(projectColor)
        
        // Color indicator
        if (rgb) {
          this.doc.setFillColor(rgb.r, rgb.g, rgb.b)
          this.doc.rect(this.margin, this.currentY - 6, 12, 12, 'F')
        }

        this.doc.setFontSize(12)
        this.doc.setTextColor(71, 85, 105)
        this.doc.setFont('helvetica', 'normal')
        this.doc.text(project || "Unassigned", this.margin + 20, this.currentY)
        
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(16, 185, 129)
        this.doc.text(`${formatHours(hours)} (${percentage}%)`, this.margin + 120, this.currentY)
        this.currentY += 18
      })
    }

    // Footer
    this.doc.setFontSize(8)
    this.doc.setTextColor(156, 163, 175)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(
      `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      this.margin,
      this.pageHeight - 20
    )
  }

  private getWeekDatesInRange(startDate: string, endDate: string, weekStartsOn: 'saturday' | 'sunday' | 'monday' = 'sunday'): Array<{ start: string; end: string; dates: string[] }> {
    const weeks: Array<{ start: string; end: string; dates: string[] }> = []
    const start = new Date(startDate + "T00:00:00")
    const end = new Date(endDate + "T00:00:00")
    
    let currentDate = new Date(start)
    
    while (currentDate <= end) {
      const week = getWeekDates(currentDate, weekStartsOn)
      weeks.push(week)
      
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7)
    }
    
    return weeks
  }

  private generateMonthlyView(weekDates: Array<{ start: string; end: string; dates: string[] }>, options: PDFExportOptions) {
    const dayNames = getWeekDayHeaders(options.weekStartsOn || 'sunday')
    const cellWidth = 25
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
      const weekEntries = options.entries.filter(entry => 
        entry.date >= week.start && entry.date <= week.end
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
      
      // Week total on the right
      this.doc.setFontSize(9)
      this.doc.setTextColor(22, 78, 99)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(`Week ${weekIndex + 1}: ${formatHours(weekTotalHours)}`, startX + (cellWidth * 7) + 10, this.currentY + 8)
      
      this.currentY += cellHeight + 5
      
      // Check if we need a new page
      if (this.currentY > this.pageHeight - 80) {
        this.doc.addPage()
        this.currentY = this.margin
      }
    }
    
    this.currentY += 15
  }

  private generateVisualMonthlyView(weekDates: Array<{ start: string; end: string; dates: string[] }>, options: PDFExportOptions) {
    const dayNames = getWeekDayHeaders(options.weekStartsOn || 'sunday')
    const cellWidth = 30
    const cellHeight = 25
    const startX = this.margin
    const startY = this.currentY

    // Draw calendar header with visual styling
    this.doc.setFillColor(241, 245, 249) // #f1f5f9
    this.doc.rect(startX, startY - 8, cellWidth * 7, 15, 'F')
    
    this.doc.setFontSize(10)
    this.doc.setTextColor(22, 78, 99)
    this.doc.setFont('helvetica', 'bold')
    
    // Day headers
    for (let i = 0; i < 7; i++) {
      const x = startX + (i * cellWidth)
      this.doc.text(dayNames[i], x + 8, startY)
    }
    
    this.currentY = startY + 20

    // Draw each week as a row with enhanced visual styling
    for (let weekIndex = 0; weekIndex < weekDates.length; weekIndex++) {
      const week = weekDates[weekIndex]
      const weekEntries = options.entries.filter(entry => 
        entry.date >= week.start && entry.date <= week.end
      )
      
      const weekTotalHours = weekEntries.reduce((sum, entry) => sum + entry.duration, 0)
      const dailyHours = this.calculateDailyHours(weekEntries)
      
      // Week background with gradient effect
      this.doc.setFillColor(248, 250, 252) // #f8fafc
      this.doc.rect(startX, this.currentY - 8, cellWidth * 7, cellHeight, 'F')
      
      // Week border with accent color
      this.doc.setDrawColor(16, 185, 129) // #10b981
      this.doc.setLineWidth(1)
      this.doc.rect(startX, this.currentY - 8, cellWidth * 7, cellHeight, 'S')
      
      // Draw each day in the week
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const date = week.dates[dayIndex]
        const x = startX + (dayIndex * cellWidth)
        const dayDate = new Date(date + "T00:00:00")
        const hours = dailyHours[date] || 0
        
        // Day cell border
        this.doc.setDrawColor(226, 232, 240)
        this.doc.setLineWidth(0.5)
        this.doc.rect(x, this.currentY - 8, cellWidth, cellHeight, 'S')
        
        // Day number
        this.doc.setFontSize(9)
        this.doc.setTextColor(71, 85, 105)
        this.doc.setFont('helvetica', 'bold')
        this.doc.text(dayDate.getDate().toString(), x + 3, this.currentY + 2)
        
        // Hours if any
        if (hours > 0) {
          this.doc.setFontSize(8)
          this.doc.setTextColor(16, 185, 129) // #10b981
          this.doc.setFont('helvetica', 'bold')
          this.doc.text(formatHours(hours), x + 3, this.currentY + 12)
          
          // Enhanced activity intensity indicator
          const intensity = Math.min(hours / 8, 1)
          const color = this.getActivityColor(intensity)
          this.doc.setFillColor(color.r, color.g, color.b)
          this.doc.circle(x + cellWidth - 8, this.currentY + 2, 3, 'F')
          
          // Add subtle border to activity indicator
          this.doc.setDrawColor(255, 255, 255)
          this.doc.setLineWidth(0.5)
          this.doc.circle(x + cellWidth - 8, this.currentY + 2, 3, 'S')
        }
      }
      
      // Week total with enhanced styling
      this.doc.setFillColor(16, 185, 129) // #10b981
      this.doc.rect(startX + (cellWidth * 7) + 10, this.currentY - 8, 60, cellHeight, 'F')
      
      this.doc.setFontSize(9)
      this.doc.setTextColor(255, 255, 255)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(`Week ${weekIndex + 1}`, startX + (cellWidth * 7) + 15, this.currentY + 2)
      this.doc.text(formatHours(weekTotalHours), startX + (cellWidth * 7) + 15, this.currentY + 12)
      
      this.currentY += cellHeight + 8
      
      // Check if we need a new page
      if (this.currentY > this.pageHeight - 80) {
        this.doc.addPage()
        this.currentY = this.margin
      }
    }
    
    this.currentY += 20
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