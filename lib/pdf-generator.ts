// PDF generation utilities for time tracking reports
import type { TimeEntry, Project } from "./database"
import { formatHours } from "./utils/date-helpers"

export interface PDFExportOptions {
  startDate: string
  endDate: string
  entries: TimeEntry[]
  projects: Project[]
  style: "professional" | "visual"
  includeActivityGrid?: boolean
}

export class PDFGenerator {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private pageWidth = 595 // A4 width in points
  private pageHeight = 842 // A4 height in points
  private margin = 50
  private currentY = 0

  constructor() {
    this.canvas = document.createElement("canvas")
    this.canvas.width = this.pageWidth
    this.canvas.height = this.pageHeight
    this.ctx = this.canvas.getContext("2d")!
  }

  async generatePDF(options: PDFExportOptions): Promise<Blob> {
    this.setupCanvas()

    if (options.style === "professional") {
      await this.generateProfessionalReport(options)
    } else {
      await this.generateVisualReport(options)
    }

    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        resolve(blob!)
      }, "image/png")
    })
  }

  private setupCanvas() {
    this.ctx.fillStyle = "#ffffff"
    this.ctx.fillRect(0, 0, this.pageWidth, this.pageHeight)
    this.currentY = this.margin
  }

  private async generateProfessionalReport(options: PDFExportOptions) {
    // Header
    this.drawText("TIME TRACKING REPORT", this.margin, this.currentY, {
      fontSize: 24,
      fontWeight: "bold",
      color: "#164e63",
    })
    this.currentY += 40

    // Date range
    const startDate = new Date(options.startDate + "T00:00:00")
    const endDate = new Date(options.endDate + "T00:00:00")
    this.drawText(
      `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      this.margin,
      this.currentY,
      { fontSize: 14, color: "#475569" },
    )
    this.currentY += 30

    // Summary statistics
    const totalHours = options.entries.reduce((sum, entry) => sum + entry.duration, 0)
    const workingDays = new Set(options.entries.map((e) => e.date)).size
    const avgHoursPerDay = workingDays > 0 ? totalHours / workingDays : 0

    this.drawText("SUMMARY", this.margin, this.currentY, {
      fontSize: 16,
      fontWeight: "bold",
      color: "#164e63",
    })
    this.currentY += 25

    const summaryData = [
      ["Total Hours:", formatHours(totalHours)],
      ["Working Days:", workingDays.toString()],
      ["Average Hours/Day:", formatHours(avgHoursPerDay)],
      ["Total Entries:", options.entries.length.toString()],
    ]

    summaryData.forEach(([label, value]) => {
      this.drawText(label, this.margin, this.currentY, { fontSize: 12, color: "#475569" })
      this.drawText(value, this.margin + 150, this.currentY, { fontSize: 12, fontWeight: "bold" })
      this.currentY += 20
    })

    this.currentY += 20

    // Project breakdown
    const projectHours = this.calculateProjectHours(options.entries)
    if (Object.keys(projectHours).length > 0) {
      this.drawText("PROJECT BREAKDOWN", this.margin, this.currentY, {
        fontSize: 16,
        fontWeight: "bold",
        color: "#164e63",
      })
      this.currentY += 25

      Object.entries(projectHours).forEach(([project, hours]) => {
        const percentage = ((hours / totalHours) * 100).toFixed(1)
        this.drawText(project || "Unassigned", this.margin, this.currentY, { fontSize: 12 })
        this.drawText(`${formatHours(hours)} (${percentage}%)`, this.margin + 200, this.currentY, {
          fontSize: 12,
          fontWeight: "bold",
        })
        this.currentY += 20
      })
    }

    this.currentY += 20

    // Daily entries table
    this.drawText("DAILY ENTRIES", this.margin, this.currentY, {
      fontSize: 16,
      fontWeight: "bold",
      color: "#164e63",
    })
    this.currentY += 25

    // Table headers
    const headers = ["Date", "Start", "End", "Duration", "Project", "Description"]
    const columnWidths = [80, 60, 60, 70, 100, 200]
    let x = this.margin

    headers.forEach((header, i) => {
      this.drawText(header, x, this.currentY, { fontSize: 10, fontWeight: "bold", color: "#164e63" })
      x += columnWidths[i]
    })
    this.currentY += 20

    // Draw line under headers
    this.ctx.strokeStyle = "#cbd5e1"
    this.ctx.lineWidth = 1
    this.ctx.beginPath()
    this.ctx.moveTo(this.margin, this.currentY - 5)
    this.ctx.lineTo(this.pageWidth - this.margin, this.currentY - 5)
    this.ctx.stroke()

    // Table rows
    options.entries.forEach((entry) => {
      if (this.currentY > this.pageHeight - 100) {
        // Start new page (simplified - just stop for now)
        return
      }

      x = this.margin
      const rowData = [
        new Date(entry.date + "T00:00:00").toLocaleDateString(),
        `${entry.start_hour.toString().padStart(2, "0")}:00`,
        `${entry.end_hour.toString().padStart(2, "0")}:00`,
        formatHours(entry.duration),
        entry.project || "-",
        entry.description || "-",
      ]

      rowData.forEach((data, i) => {
        this.drawText(data, x, this.currentY, { fontSize: 9, color: "#475569" })
        x += columnWidths[i]
      })
      this.currentY += 18
    })

    // Footer
    this.drawText(
      `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      this.margin,
      this.pageHeight - 30,
      { fontSize: 8, color: "#9ca3af" },
    )
  }

  private async generateVisualReport(options: PDFExportOptions) {
    // Header with visual styling
    this.ctx.fillStyle = "#164e63"
    this.ctx.fillRect(0, 0, this.pageWidth, 80)

    this.drawText("TIME TRACKING REPORT", this.margin, 35, {
      fontSize: 24,
      fontWeight: "bold",
      color: "#ffffff",
    })

    this.drawText("Visual Activity Overview", this.margin, 55, {
      fontSize: 14,
      color: "#ecfeff",
    })

    this.currentY = 100

    // Date range with background
    this.ctx.fillStyle = "#ecfeff"
    this.ctx.fillRect(this.margin - 10, this.currentY - 5, this.pageWidth - 2 * this.margin + 20, 30)

    const startDate = new Date(options.startDate + "T00:00:00")
    const endDate = new Date(options.endDate + "T00:00:00")
    this.drawText(
      `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      this.margin,
      this.currentY + 15,
      { fontSize: 16, fontWeight: "bold", color: "#164e63" },
    )
    this.currentY += 50

    // Activity grid (simplified version)
    if (options.includeActivityGrid) {
      this.drawText("Activity Overview", this.margin, this.currentY, {
        fontSize: 18,
        fontWeight: "bold",
        color: "#164e63",
      })
      this.currentY += 30

      const dailyHours = this.calculateDailyHours(options.entries)
      const gridSize = 15
      const gridSpacing = 18
      let gridX = this.margin
      let gridY = this.currentY

      Object.entries(dailyHours).forEach(([date, hours], index) => {
        if (index > 0 && index % 20 === 0) {
          gridX = this.margin
          gridY += gridSpacing
        }

        const intensity = Math.min(hours / 8, 1) // Normalize to 8 hours max
        const color = this.getActivityColor(intensity)

        this.ctx.fillStyle = color
        this.ctx.fillRect(gridX, gridY, gridSize, gridSize)

        gridX += gridSpacing
      })

      this.currentY = gridY + 40
    }

    // Summary with visual elements
    const totalHours = options.entries.reduce((sum, entry) => sum + entry.duration, 0)
    const workingDays = new Set(options.entries.map((e) => e.date)).size

    // Large total hours display
    this.drawText(formatHours(totalHours), this.margin, this.currentY, {
      fontSize: 48,
      fontWeight: "bold",
      color: "#10b981",
    })
    this.drawText("Total Hours Tracked", this.margin, this.currentY + 20, {
      fontSize: 14,
      color: "#475569",
    })

    // Project breakdown with colors
    this.currentY += 80
    const projectHours = this.calculateProjectHours(options.entries)

    this.drawText("Project Distribution", this.margin, this.currentY, {
      fontSize: 18,
      fontWeight: "bold",
      color: "#164e63",
    })
    this.currentY += 30

    Object.entries(projectHours).forEach(([project, hours], index) => {
      const percentage = ((hours / totalHours) * 100).toFixed(1)
      const color = options.projects.find((p) => p.name === project)?.color || "#6b7280"

      // Color indicator
      this.ctx.fillStyle = color
      this.ctx.fillRect(this.margin, this.currentY - 8, 12, 12)

      this.drawText(project || "Unassigned", this.margin + 20, this.currentY, { fontSize: 14 })
      this.drawText(`${formatHours(hours)} (${percentage}%)`, this.margin + 200, this.currentY, {
        fontSize: 14,
        fontWeight: "bold",
        color: color,
      })
      this.currentY += 25
    })
  }

  private drawText(
    text: string,
    x: number,
    y: number,
    options: {
      fontSize?: number
      fontWeight?: string
      color?: string
    } = {},
  ) {
    const { fontSize = 12, fontWeight = "normal", color = "#000000" } = options

    this.ctx.font = `${fontWeight} ${fontSize}px Arial, sans-serif`
    this.ctx.fillStyle = color
    this.ctx.fillText(text, x, y)
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

  private getActivityColor(intensity: number): string {
    if (intensity === 0) return "#f1f5f9"
    if (intensity < 0.25) return "#a7f3d0"
    if (intensity < 0.5) return "#6ee7b7"
    if (intensity < 0.75) return "#34d399"
    return "#10b981"
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
  link.download = `time-report-${options.startDate}-to-${options.endDate}-${options.style}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
