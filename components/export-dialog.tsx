"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, CalendarIcon, Loader2, ChevronsUpDown } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { db, type TimeEntry, type Project, getUserSettings } from "@/lib/database"
import { exportToPDF, type PDFLanguage } from "@/lib/pdf-generator"
import { formatDate, formatHours } from "@/lib/utils/date-helpers"
import { useCurrency } from "@/lib/context/currency-context"
import { cn } from "@/lib/utils"

interface ExportDialogProps {
  children: React.ReactNode
  defaultStartDate?: Date
  defaultEndDate?: Date
}

export function ExportDialog({ children, defaultStartDate, defaultEndDate }: ExportDialogProps) {
  const { currency, formatAmount } = useCurrency()
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [startDate, setStartDate] = useState<Date>(defaultStartDate || new Date())
  const [endDate, setEndDate] = useState<Date>(defaultEndDate || new Date())
  const [exportStyle, setExportStyle] = useState<"professional" | "visual">("professional")
  const [exportLanguage, setExportLanguage] = useState<PDFLanguage>("en")
  const [showProjects, setShowProjects] = useState(false)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [previewData, setPreviewData] = useState<{
    totalHours: number
    totalBillable: number
    workingDays: number
    projectBreakdown: { [project: string]: { hours: number; billable: number } }
  }>({
    totalHours: 0,
    totalBillable: 0,
    workingDays: 0,
    projectBreakdown: {}
  })
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [userSettings, setUserSettings] = useState<any>(null)

  useEffect(() => {
    if (isOpen) {
      loadCompanySettings()
      loadUserSettings()
      loadData()
    }
  }, [isOpen, startDate, endDate])

  // Calculate distinct available projects based on definition + usage
  const availableProjects = Array.from(new Set([
    ...projects.map(p => p.name),
    ...entries.map(e => e.project || "Unassigned")
  ])).sort()

  // Update preview when dependencies change
  useEffect(() => {
    calculatePreview()
  }, [entries, selectedProjects])

  const loadCompanySettings = async () => {
    try {
      const settings = await db.getCompanySettings()
      setCompanySettings(settings)
    } catch (error) {
      console.error("Failed to load company settings:", error)
    }
  }

  const loadUserSettings = async () => {
    try {
      const settings = await getUserSettings()
      setUserSettings(settings)
    } catch (error) {
      console.error("Failed to load user settings:", error)
    }
  }

  const loadData = async () => {
    try {
      const [entriesData, projectsData] = await Promise.all([
        db.getTimeEntries(formatDate(startDate), formatDate(endDate)),
        db.getProjects(),
      ])

      setEntries(entriesData)
      setProjects(projectsData)

      // By default select all available projects when data loads
      const allProjects = Array.from(new Set([
        ...projectsData.map(p => p.name),
        ...entriesData.map(e => e.project || "Unassigned")
      ]))
      setSelectedProjects(allProjects)
    } catch (error) {
      console.error("Failed to load data:", error)
    }
  }

  const calculatePreview = () => {
    // Filter entries based on selection
    const filteredEntries = entries.filter((entry) =>
      selectedProjects.includes(entry.project || "Unassigned")
    )

    // Calculate statistics
    const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.duration, 0)
    const totalBillable = filteredEntries.reduce((sum, entry) => {
      const rate = entry.billableRate || 0
      return sum + (entry.duration * rate)
    }, 0)
    const workingDays = new Set(filteredEntries.map((e) => e.date)).size
    const projectBreakdown: { [project: string]: { hours: number; billable: number } } = {}

    filteredEntries.forEach((entry) => {
      const project = entry.project || "Unassigned"
      if (!projectBreakdown[project]) {
        projectBreakdown[project] = { hours: 0, billable: 0 }
      }
      projectBreakdown[project].hours += entry.duration
      projectBreakdown[project].billable += entry.duration * (entry.billableRate || 0)
    })

    setPreviewData({ totalHours, totalBillable, workingDays, projectBreakdown })
  }

  const handleExport = async () => {
    if (!previewData) return

    setIsExporting(true)
    try {
      const filteredEntries = entries.filter((entry) =>
        selectedProjects.includes(entry.project || "Unassigned")
      )

      await exportToPDF({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        entries: filteredEntries,
        projects,
        style: exportStyle,
        showProjects,
        weekStartsOn: companySettings?.weekStartsOn || 'sunday',
        currency,
        language: exportLanguage,
        userSettings: userSettings ? {
          firstName: userSettings.firstName,
          lastName: userSettings.lastName,
        } : undefined,
        companySettings: companySettings ? {
          companyName: companySettings.companyName,
          timezone: companySettings.timezone,
        } : undefined,
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
          <DialogDescription>
            Select a date range and export your time tracking data as a PDF report.
          </DialogDescription>
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
                    weekStartsOn={companySettings?.weekStartsOn === 'saturday' ? 6 : companySettings?.weekStartsOn === 'monday' ? 1 : 0}
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
                    weekStartsOn={companySettings?.weekStartsOn === 'saturday' ? 6 : companySettings?.weekStartsOn === 'monday' ? 1 : 0}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <Label>Projects</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {selectedProjects.length === 0
                    ? "Select projects..."
                    : selectedProjects.length === availableProjects.length
                      ? "All Projects"
                      : `${selectedProjects.length} selected`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <div className="p-2 border-b">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedProjects.length === availableProjects.length && availableProjects.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedProjects(availableProjects)
                        else setSelectedProjects([])
                      }}
                    />
                    <Label htmlFor="select-all" className="font-normal cursor-pointer">Select All </Label>
                  </div>
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="p-2 space-y-2">
                    {availableProjects.map((project) => (
                      <div key={project} className="flex items-center space-x-2">
                        <Checkbox
                          id={`project-${project}`}
                          checked={selectedProjects.includes(project)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProjects([...selectedProjects, project])
                            } else {
                              setSelectedProjects(selectedProjects.filter((p) => p !== project))
                            }
                          }}
                        />
                        <Label htmlFor={`project-${project}`} className="font-normal cursor-pointer flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getProjectColor(project) }}
                          />
                          {project}
                        </Label>
                      </div>
                    ))}
                    {availableProjects.length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">No projects found for this period.</div>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
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
                    <span className="font-medium">Weekly Breakdown</span>
                    <span className="text-sm text-muted-foreground">Professional per-week summary with billable amounts</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label>Report Language</Label>
            <Select value={exportLanguage} onValueChange={(value: PDFLanguage) => setExportLanguage(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="pl">Polski</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-projects"
                checked={showProjects}
                onCheckedChange={(checked) => setShowProjects(checked as boolean)}
              />
              <Label htmlFor="show-projects">Show project breakdown per week</Label>
            </div>
          </div>

          {/* Preview */}
          {previewData && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="font-medium mb-3">Report Preview</h4>

              {/* Report Header Info */}
              {(userSettings || companySettings) && (
                <div className="mb-4 p-3 bg-background rounded border">
                  <div className="text-sm font-medium mb-2">Report Header:</div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {userSettings && (userSettings.firstName || userSettings.lastName) && (
                      <div>Employee: {`${userSettings.firstName || ''} ${userSettings.lastName || ''}`.trim()}</div>
                    )}
                    {companySettings?.companyName && (
                      <div>Company: {companySettings.companyName}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{formatHours(previewData.totalHours)}</div>
                  <div className="text-sm text-muted-foreground">Total Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {formatAmount(previewData.totalBillable)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Billable</div>
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
                    {Object.entries(previewData.projectBreakdown).map(([project, data]) => (
                      <Badge key={project} variant="secondary" className="gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getProjectColor(project) }} />
                        {project}: {formatHours(data.hours)} ({formatAmount(data.billable)})
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
