"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, CalendarIcon, Loader2 } from "lucide-react"
import { db, type TimeEntry, type Project } from "@/lib/database"
import { exportToPDF } from "@/lib/pdf-generator"
import { formatDate, formatHours } from "@/lib/utils/date-helpers"
import { cn } from "@/lib/utils"

interface ExportDialogProps {
  children: React.ReactNode
  defaultStartDate?: Date
  defaultEndDate?: Date
}

export function ExportDialog({ children, defaultStartDate, defaultEndDate }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [startDate, setStartDate] = useState<Date>(defaultStartDate || new Date())
  const [endDate, setEndDate] = useState<Date>(defaultEndDate || new Date())
  const [exportStyle, setExportStyle] = useState<"professional" | "visual">("professional")
  const [includeActivityGrid, setIncludeActivityGrid] = useState(true)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [previewData, setPreviewData] = useState<{
    totalHours: number
    workingDays: number
    projectBreakdown: { [project: string]: number }
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadPreviewData()
    }
  }, [isOpen, startDate, endDate])

  const loadPreviewData = async () => {
    try {
      const [entriesData, projectsData] = await Promise.all([
        db.getTimeEntries(formatDate(startDate), formatDate(endDate)),
        db.getProjects(),
      ])

      setEntries(entriesData)
      setProjects(projectsData)

      // Calculate preview statistics
      const totalHours = entriesData.reduce((sum, entry) => sum + entry.duration, 0)
      const workingDays = new Set(entriesData.map((e) => e.date)).size
      const projectBreakdown: { [project: string]: number } = {}

      entriesData.forEach((entry) => {
        const project = entry.project || "Unassigned"
        projectBreakdown[project] = (projectBreakdown[project] || 0) + entry.duration
      })

      setPreviewData({ totalHours, workingDays, projectBreakdown })
    } catch (error) {
      console.error("Failed to load preview data:", error)
    }
  }

  const handleExport = async () => {
    if (!previewData) return

    setIsExporting(true)
    try {
      await exportToPDF({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        entries,
        projects,
        style: exportStyle,
        includeActivityGrid,
      })
      setIsOpen(false)
    } catch (error) {
      console.error("Export failed:", error)
      alert("Export failed. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const getProjectColor = (projectName: string): string => {
    if (projectName === "Unassigned") return "#6b7280"
    const project = projects.find((p) => p.name === projectName)
    return project?.color || "#6b7280"
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Time Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? startDate.toLocaleDateString() : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? endDate.toLocaleDateString() : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Export Style */}
          <div className="space-y-2">
            <Label>Export Style</Label>
            <Select value={exportStyle} onValueChange={(value: "professional" | "visual") => setExportStyle(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">
                  <div className="flex flex-col">
                    <span className="font-medium">Professional</span>
                    <span className="text-sm text-muted-foreground">Clean tables and text for business use</span>
                  </div>
                </SelectItem>
                <SelectItem value="visual">
                  <div className="flex flex-col">
                    <span className="font-medium">Visual</span>
                    <span className="text-sm text-muted-foreground">GitHub-style activity grid and colors</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          {exportStyle === "visual" && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="activity-grid"
                checked={includeActivityGrid}
                onCheckedChange={(checked) => setIncludeActivityGrid(checked as boolean)}
              />
              <Label htmlFor="activity-grid">Include activity grid visualization</Label>
            </div>
          )}

          {/* Preview */}
          {previewData && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="font-medium mb-3">Report Preview</h4>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{formatHours(previewData.totalHours)}</div>
                  <div className="text-sm text-muted-foreground">Total Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{previewData.workingDays}</div>
                  <div className="text-sm text-muted-foreground">Working Days</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{entries.length}</div>
                  <div className="text-sm text-muted-foreground">Entries</div>
                </div>
              </div>

              {Object.keys(previewData.projectBreakdown).length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Project Breakdown:</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(previewData.projectBreakdown).map(([project, hours]) => (
                      <Badge key={project} variant="secondary" className="gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getProjectColor(project) }} />
                        {project}: {formatHours(hours)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting || !previewData} className="gap-2">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
