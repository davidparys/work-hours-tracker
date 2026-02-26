"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { db, type Project } from "@/lib/database"
import { useCurrency } from "@/lib/context/currency-context"
import { formatDate, formatHours } from "@/lib/utils/date-helpers"

interface QuickAddWidgetProps {
  onDataChange: () => void
}

function getTodayString() {
  return formatDate(new Date())
}

export function QuickAddWidget({ onDataChange }: QuickAddWidgetProps) {
  const { symbol: currencySymbol } = useCurrency()

  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [defaultBillableRate, setDefaultBillableRate] = useState<number | undefined>()
  const [todayHours, setTodayHours] = useState(0)

  const [date, setDate] = useState(getTodayString())
  const [projectId, setProjectId] = useState<number | undefined>()
  const [startHour, setStartHour] = useState(9)
  const [endHour, setEndHour] = useState(10)
  const [description, setDescription] = useState("")
  const [billableRate, setBillableRate] = useState<number | undefined>()
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const loadTodayHours = useCallback(async () => {
    try {
      const today = getTodayString()
      const entries = await db.getTimeEntries(today, today)
      const total = entries.reduce((sum, e) => sum + e.duration, 0)
      setTodayHours(total)
    } catch {
      // silently ignore
    }
  }, [])

  const loadInitialData = useCallback(async () => {
    try {
      const [allProjects, settings] = await Promise.all([db.getProjects(), db.getUserSettings()])
      setProjects(allProjects.filter((p) => p.isActive !== false))
      setDefaultBillableRate(settings?.defaultBillableRate ?? undefined)
    } catch {
      // silently ignore
    }
  }, [])

  useEffect(() => {
    loadInitialData()
    loadTodayHours()
  }, [loadInitialData, loadTodayHours])

  // Global keyboard shortcut: Cmd/Ctrl+Shift+H
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "H") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      // Reset to today on open
      setDate(getTodayString())
      loadTodayHours()
      setError("")
    }
  }

  const handleProjectChange = (value: string) => {
    const id = value === "no-project" ? undefined : Number(value)
    setProjectId(id)
    const project = id ? projects.find((p) => p.id === id) : undefined
    const rate = project?.defaultBillableRate ?? defaultBillableRate ?? undefined
    setBillableRate(rate)
  }

  const resetForm = () => {
    setDate(getTodayString())
    setProjectId(undefined)
    setStartHour(9)
    setEndHour(10)
    setDescription("")
    setBillableRate(undefined)
    setError("")
  }

  const handleSubmit = async () => {
    if (endHour <= startHour) {
      setError("End time must be after start time")
      return
    }
    setError("")
    setSubmitting(true)
    try {
      await db.addTimeEntry({
        date,
        startHour,
        endHour,
        duration: endHour - startHour,
        projectId: projectId ?? null,
        billableRate,
        description: description || undefined,
      })
      onDataChange()
      await loadTodayHours()
      setOpen(false)
      resetForm()
    } catch {
      setError("Failed to add entry. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setOpen(false)
    resetForm()
  }

  const badgeLabel = todayHours > 0 ? `${formatHours(todayHours)} today` : "Log time"

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button size="sm" className="rounded-full shadow-lg gap-2 px-4 h-10">
            <Plus className="h-4 w-4" />
            {badgeLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" sideOffset={8} className="w-80 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">Quick Add</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
              ⌘⇧H
            </span>
          </div>

          <div className="space-y-3">
            {/* Date */}
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Project */}
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Project</label>
              <Select
                value={projectId?.toString() ?? "no-project"}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="No Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-project">No Project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id!.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start / End */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">Start</label>
                <Select
                  value={startHour.toString()}
                  onValueChange={(v) => {
                    setStartHour(Number(v))
                    setError("")
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">End</label>
                <Select
                  value={endHour.toString()}
                  onValueChange={(v) => {
                    setEndHour(Number(v))
                    setError("")
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {/* Description */}
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">
                Description <span className="font-normal">(optional)</span>
              </label>
              <Input
                placeholder="What did you work on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit()
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Add Entry
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
