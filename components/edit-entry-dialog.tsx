"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type TimeEntry, type Project, db } from "@/lib/database"
import { useCurrency } from "@/lib/context/currency-context"

interface EditEntryDialogProps {
  entry: TimeEntry | null
  projects: Project[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onEntryUpdated: () => void
}

export function EditEntryDialog({ entry, projects, open, onOpenChange, onEntryUpdated }: EditEntryDialogProps) {
  const { symbol: currencySymbol } = useCurrency()
  const [formData, setFormData] = useState<{
    startHour: number
    endHour: number
    projectId: number | undefined
    billableRate: number | undefined
    description: string
  }>({
    startHour: 9,
    endHour: 10,
    projectId: undefined,
    billableRate: undefined,
    description: "",
  })

  useEffect(() => {
    if (entry) {
      setFormData({
        startHour: entry.startHour,
        endHour: entry.endHour,
        projectId: entry.projectId,
        billableRate: entry.billableRate,
        description: entry.description || "",
      })
    }
  }, [entry])

  const handleSave = async () => {
    if (!entry) return

    if (formData.startHour >= formData.endHour) {
      alert("End time must be after start time")
      return
    }

    const duration = formData.endHour - formData.startHour

    try {
      await db.updateTimeEntry(entry.id!, {
        startHour: formData.startHour,
        endHour: formData.endHour,
        duration,
        projectId: formData.projectId,
        billableRate: formData.billableRate,
        description: formData.description || undefined,
      })
      onEntryUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update entry:", error)
      alert("Failed to update entry")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Time</label>
              <Select
                value={formData.startHour.toString()}
                onValueChange={(value) => setFormData({ ...formData, startHour: Number.parseInt(value) })}
              >
                <SelectTrigger>
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
              <label className="text-sm font-medium mb-2 block">End Time</label>
              <Select
                value={formData.endHour.toString()}
                onValueChange={(value) => setFormData({ ...formData, endHour: Number.parseInt(value) })}
              >
                <SelectTrigger>
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

          <div>
            <label className="text-sm font-medium mb-2 block">Project</label>
            <Select
              value={formData.projectId?.toString() || "no-project"}
              onValueChange={(value) => setFormData({ ...formData, projectId: value === "no-project" ? undefined : Number(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-project">No Project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id!.toString()}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Billable Rate (per hour)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="pl-7"
                value={formData.billableRate || ""}
                onChange={(e) => setFormData({ ...formData, billableRate: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="Default rate"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              placeholder="What did you work on?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
