"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Pencil, AlertCircle } from "lucide-react"
import { type Project, type TimeEntry, db } from "@/lib/database"
import { formatHours } from "@/lib/utils/date-helpers"

interface BulkEditDialogProps {
  entries: TimeEntry[]
  projects: Project[]
  periodLabel: string // e.g., "December 1, 2025" or "Week of Nov 25" or "November 2025"
  onEntriesUpdated: () => void
  children: React.ReactNode
}

export function BulkEditDialog({
  entries,
  projects,
  periodLabel,
  onEntriesUpdated,
  children
}: BulkEditDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userSettings, setUserSettings] = useState<any>(null)

  // Project scope filter (which entries to edit)
  const [scopeProjectId, setScopeProjectId] = useState<string>("all")

  // Form state
  const [updateBillableRate, setUpdateBillableRate] = useState(true)
  const [updateProject, setUpdateProject] = useState(false)
  const [updateDescription, setUpdateDescription] = useState(false)

  const [billableRate, setBillableRate] = useState<string>("")
  const [projectId, setProjectId] = useState<string>("")
  const [description, setDescription] = useState("")

  // Projects that actually have entries in this period
  const activeProjectIds = new Set(entries.map((e) => e.projectId).filter((id) => id !== undefined))
  const periodProjects = projects.filter((p) => activeProjectIds.has(p.id))
  const hasMixedProjects = periodProjects.length > 1 || (periodProjects.length >= 1 && entries.some((e) => !e.projectId))

  // Entries scoped to the selected project filter
  const scopedEntries = scopeProjectId === "all"
    ? entries
    : scopeProjectId === "no-project"
    ? entries.filter((e) => !e.projectId)
    : entries.filter((e) => e.projectId === Number(scopeProjectId))

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await db.getUserSettings()
        setUserSettings(settings)
        if (settings?.defaultBillableRate) {
          setBillableRate(settings.defaultBillableRate.toString())
        }
      } catch (error) {
        console.error("Failed to load user settings:", error)
      }
    }
    loadSettings()
  }, [])

  // Calculate summary stats based on scoped entries
  const totalHours = scopedEntries.reduce((sum, e) => sum + e.duration, 0)
  const entriesWithBillableRate = scopedEntries.filter(e => e.billableRate && e.billableRate > 0).length
  const entriesWithoutBillableRate = scopedEntries.length - entriesWithBillableRate
  const currentEarnings = scopedEntries.reduce((sum, e) => sum + (e.duration * (e.billableRate || 0)), 0)

  // Calculate projected earnings if billable rate is applied
  const projectedEarnings = updateBillableRate && billableRate 
    ? totalHours * parseFloat(billableRate)
    : currentEarnings

  const handleApply = async () => {
    if (scopedEntries.length === 0) {
      alert("No entries to update")
      return
    }

    const updates: { billableRate?: number; projectId?: number; description?: string } = {}

    if (updateBillableRate && billableRate) {
      updates.billableRate = parseFloat(billableRate)
    }

    if (updateProject && projectId) {
      updates.projectId = projectId === "no-project" ? undefined : Number(projectId)
    }

    if (updateDescription) {
      updates.description = description || undefined
    }

    if (Object.keys(updates).length === 0) {
      alert("Please select at least one field to update and provide a value")
      return
    }

    setIsLoading(true)

    try {
      const entryIds = scopedEntries.map(e => e.id!).filter(id => id !== undefined)
      await db.batchUpdateTimeEntries(entryIds, updates)

      onEntriesUpdated()
      setOpen(false)

      // Reset form
      setScopeProjectId("all")
      setUpdateBillableRate(true)
      setUpdateProject(false)
      setUpdateDescription(false)
      setProjectId("")
      setDescription("")
      if (userSettings?.defaultBillableRate) {
        setBillableRate(userSettings.defaultBillableRate.toString())
      }
    } catch (error) {
      console.error("Error updating entries:", error)
      alert("Error updating entries. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const canApply = (updateBillableRate && billableRate) ||
                   (updateProject && projectId) ||
                   updateDescription

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Bulk Edit Entries
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project scope selector */}
          {hasMixedProjects && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Edit entries for</Label>
              <Select value={scopeProjectId} onValueChange={setScopeProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects ({entries.length} entries)</SelectItem>
                  {periodProjects.map((project) => {
                    const count = entries.filter((e) => e.projectId === project.id).length
                    return (
                      <SelectItem key={project.id} value={project.id!.toString()}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                          {project.name}
                          <span className="text-muted-foreground text-xs">({count})</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                  {entries.some((e) => !e.projectId) && (
                    <SelectItem value="no-project">
                      No project ({entries.filter((e) => !e.projectId).length} entries)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Summary */}
          <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-2">
            <div className="text-sm font-medium">{periodLabel}</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Entries:</span>{" "}
                <span className="font-medium">{scopedEntries.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Hours:</span>{" "}
                <span className="font-medium">{formatHours(totalHours)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Current Earnings:</span>{" "}
                <span className="font-medium">${currentEarnings.toFixed(2)}</span>
              </div>
              {entriesWithoutBillableRate > 0 && (
                <div className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="text-xs">{entriesWithoutBillableRate} without rate</span>
                </div>
              )}
            </div>
          </div>

          {scopedEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No entries found{scopeProjectId !== "all" ? " for this project" : " for this period"}.</p>
              {scopeProjectId === "all" && <p className="text-sm mt-1">Add some time entries first.</p>}
            </div>
          ) : (
            <>
              {/* Field Selectors */}
              <div className="space-y-4">
                <div className="text-sm font-medium">Select fields to update:</div>
                
                {/* Billable Rate */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="update-rate" 
                      checked={updateBillableRate}
                      onCheckedChange={(checked) => setUpdateBillableRate(!!checked)}
                    />
                    <Label htmlFor="update-rate" className="text-sm font-medium cursor-pointer">
                      Billable Rate
                    </Label>
                  </div>
                  {updateBillableRate && (
                    <div className="ml-6">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-7"
                          value={billableRate}
                          onChange={(e) => setBillableRate(e.target.value)}
                          placeholder={userSettings?.defaultBillableRate?.toString() || "0.00"}
                        />
                      </div>
                      {userSettings?.defaultBillableRate && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="h-auto p-0 text-xs text-muted-foreground"
                          onClick={() => setBillableRate(userSettings.defaultBillableRate.toString())}
                        >
                          Use default rate (${userSettings.defaultBillableRate}/hr)
                        </Button>
                      )}
                      {billableRate && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Projected earnings: <span className="text-foreground font-medium">${projectedEarnings.toFixed(2)}</span>
                          {projectedEarnings > currentEarnings && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              +${(projectedEarnings - currentEarnings).toFixed(2)}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Project */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="update-project" 
                      checked={updateProject}
                      onCheckedChange={(checked) => setUpdateProject(!!checked)}
                    />
                    <Label htmlFor="update-project" className="text-sm font-medium cursor-pointer">
                      Project
                    </Label>
                  </div>
                  {updateProject && (
                    <div className="ml-6">
                      <Select value={projectId} onValueChange={setProjectId}>
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
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="update-description" 
                      checked={updateDescription}
                      onCheckedChange={(checked) => setUpdateDescription(!!checked)}
                    />
                    <Label htmlFor="update-description" className="text-sm font-medium cursor-pointer">
                      Description
                    </Label>
                  </div>
                  {updateDescription && (
                    <div className="ml-6">
                      <Textarea
                        placeholder="Enter description (leave empty to clear)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={isLoading || scopedEntries.length === 0 || !canApply}
          >
            {isLoading ? "Updating..." : `Update ${scopedEntries.length} Entries`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}









