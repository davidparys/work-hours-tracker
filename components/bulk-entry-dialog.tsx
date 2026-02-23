"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Zap } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { type Project, db } from "@/lib/database"
import { formatDate } from "@/lib/utils/date-helpers"

interface BulkEntryDialogProps {
  projects: Project[]
  onEntriesAdded: () => void
  children: React.ReactNode
}

interface HourAssignment {
  hour: number
  projectId?: number
  billableRate?: number
  description: string
}

export function BulkEntryDialog({ projects, onEntriesAdded, children }: BulkEntryDialogProps) {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [hoursPerDay, setHoursPerDay] = useState("8")
  const [startTime, setStartTime] = useState("9")
  const [hourAssignments, setHourAssignments] = useState<HourAssignment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedHours, setSelectedHours] = useState<Set<number>>(new Set())
  const [bulkProjectId, setBulkProjectId] = useState<number | undefined>()
  const [bulkBillableRate, setBulkBillableRate] = useState<number | undefined>()
  const [bulkDescription, setBulkDescription] = useState("")
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [userSettings, setUserSettings] = useState<any>(null)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [compSettings, usrSettings] = await Promise.all([
          db.getCompanySettings(),
          db.getUserSettings()
        ])
        setCompanySettings(compSettings)
        setUserSettings(usrSettings)
        if (usrSettings?.defaultBillableRate) {
          setBulkBillableRate(usrSettings.defaultBillableRate)
        }
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }
    loadSettings()
  }, [])

  const generateHourAssignments = () => {
    const hours = Number.parseFloat(hoursPerDay)
    const start = Number.parseInt(startTime)

    const assignments: HourAssignment[] = []
    for (let i = 0; i < 24; i++) {
      const isWorkingHour = i >= start && i < start + hours
      assignments.push({
        hour: i,
        projectId: isWorkingHour ? hourAssignments[i]?.projectId : undefined,
        billableRate: isWorkingHour ? (hourAssignments[i]?.billableRate || userSettings?.defaultBillableRate) : undefined,
        description: isWorkingHour ? hourAssignments[i]?.description || "" : "",
      })
    }
    setHourAssignments(assignments)
  }

  useEffect(() => {
    generateHourAssignments()
  }, [hoursPerDay, startTime])

  const updateHourAssignment = (index: number, field: keyof HourAssignment, value: any) => {
    setHourAssignments((prev) =>
      prev.map((assignment, i) => {
        if (i !== index) return assignment
        const updated = { ...assignment, [field]: value }
        // When project changes, prefill billable rate from project rate → user default
        if (field === "projectId") {
          const selectedProject = value ? projects.find((p) => p.id === value) : undefined
          updated.billableRate = selectedProject?.defaultBillableRate ?? userSettings?.defaultBillableRate ?? assignment.billableRate
        }
        return updated
      }),
    )
  }

  const toggleHourSelection = (index: number) => {
    setSelectedHours((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const selectAllHours = () => {
    setSelectedHours(new Set(Array.from({ length: hourAssignments.length }, (_, i) => i)))
  }

  const clearSelection = () => {
    setSelectedHours(new Set())
  }

  const applyBulkToSelected = () => {
    if (selectedHours.size === 0) return

    setHourAssignments((prev) =>
      prev.map((assignment, index) =>
        selectedHours.has(index) ? { 
          ...assignment, 
          projectId: bulkProjectId, 
          billableRate: bulkBillableRate,
          description: bulkDescription 
        } : assignment,
      ),
    )

    setSelectedHours(new Set())
    setBulkProjectId(undefined)
    setBulkBillableRate(userSettings?.defaultBillableRate)
    setBulkDescription("")
  }

  const applyToAll = () => {
    setHourAssignments((prev) =>
      prev.map((assignment) => ({
        ...assignment,
        projectId: bulkProjectId,
        billableRate: bulkBillableRate,
        description: bulkDescription,
      })),
    )
    setBulkProjectId(undefined)
    setBulkBillableRate(userSettings?.defaultBillableRate)
    setBulkDescription("")
  }

  const handleBulkAdd = async () => {
    if (!startDate || !endDate || !hoursPerDay || !startTime) {
      alert("Please fill in all required fields")
      return
    }

    const hours = Number.parseFloat(hoursPerDay)
    const start = Number.parseInt(startTime)

    if (hours <= 0 || hours > 16) {
      alert("Hours per day must be between 0 and 16")
      return
    }

    if (start < 0 || start > 23) {
      alert("Start time must be between 0 and 23")
      return
    }

    const endHour = start + hours
    if (endHour > 24) {
      alert("End time cannot exceed 24:00")
      return
    }

    setIsLoading(true)

    try {
      const currentDate = new Date(startDate)
      const finalDate = new Date(endDate)

      while (currentDate <= finalDate) {
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          for (const assignment of hourAssignments) {
            // Only add entries for working hours that have a project assigned
            if (isWorkingHour(assignment.hour) && assignment.projectId) {
              await db.addTimeEntry({
                date: formatDate(currentDate),
                startHour: assignment.hour,
                endHour: assignment.hour + 1,
                duration: 1,
                projectId: assignment.projectId,
                billableRate: assignment.billableRate,
                description: assignment.description || undefined,
              })
            }
          }
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }

      onEntriesAdded()
      setOpen(false)

      setStartDate(undefined)
      setEndDate(undefined)
      setHoursPerDay("8")
      setStartTime("9")
      setHourAssignments([])
      setSelectedHours(new Set())
      setBulkProjectId(undefined)
      setBulkBillableRate(userSettings?.defaultBillableRate)
      setBulkDescription("")
    } catch (error) {
      console.error("Error adding bulk entries:", error)
      alert("Error adding entries. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const isCoreHour = (hour: number) => {
    if (!companySettings) return false
    const coreStart = companySettings.core_hours_start || 9
    const coreEnd = companySettings.core_hours_end || 17
    return hour >= coreStart && hour < coreEnd
  }

  const isWorkingHour = (hour: number) => {
    const start = Number.parseInt(startTime)
    const hours = Number.parseFloat(hoursPerDay)
    return hour >= start && hour < start + hours
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Bulk Add Time Entries
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar 
                    mode="single" 
                    selected={startDate} 
                    onSelect={setStartDate} 
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
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar 
                    mode="single" 
                    selected={endDate} 
                    onSelect={setEndDate} 
                    initialFocus 
                    weekStartsOn={companySettings?.weekStartsOn === 'saturday' ? 6 : companySettings?.weekStartsOn === 'monday' ? 1 : 0}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hours per Day</Label>
              <Input
                type="number"
                min="0.5"
                max="16"
                step="0.5"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(e.target.value)}
                placeholder="8"
              />
            </div>

            <div className="space-y-2">
              <Label>Start Time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
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

          {hourAssignments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Project Assignment by Hour</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllHours} className="h-7 text-xs bg-transparent">
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection} className="h-7 text-xs bg-transparent">
                    Clear
                  </Button>
                </div>
              </div>

              {selectedHours.size > 0 && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-md space-y-2">
                  <div className="text-sm font-medium text-primary">
                    Apply to {selectedHours.size} selected hour{selectedHours.size > 1 ? "s" : ""}
                  </div>
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Select
                        value={bulkProjectId?.toString() || ""}
                        onValueChange={(val) => {
                          const selectedProject = val ? projects.find((p) => p.id === Number(val)) : undefined
                          setBulkProjectId(val ? Number(val) : undefined)
                          if (selectedProject?.defaultBillableRate != null) {
                            setBulkBillableRate(selectedProject.defaultBillableRate)
                          } else {
                            setBulkBillableRate(userSettings?.defaultBillableRate)
                          }
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((proj) => (
                            <SelectItem key={proj.id} value={proj.id!.toString()}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
                                {proj.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-5">
                      <Input
                        placeholder="Description"
                        value={bulkDescription}
                        onChange={(e) => setBulkDescription(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-2 flex gap-1">
                      <Button
                        size="sm"
                        onClick={applyBulkToSelected}
                        className="h-8 px-2 text-xs"
                        disabled={!bulkProjectId}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyToAll}
                    className="h-7 text-xs w-full bg-transparent"
                    disabled={!bulkProjectId}
                  >
                    Apply to All Hours
                  </Button>
                </div>
              )}

              <div className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-3 bg-muted/20">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-muted/20 py-1">
                    Early Hours (00:00 - 08:59)
                  </div>
                  {hourAssignments.slice(0, 9).map((assignment, index) => (
                    <div
                      key={index}
                      className={cn(
                        "grid grid-cols-12 gap-2 items-center py-1 px-2 rounded",
                        !isWorkingHour(assignment.hour) && "opacity-40",
                        isCoreHour(assignment.hour) && "bg-primary/10 border border-primary/20",
                      )}
                    >
                      <div className="col-span-1 flex justify-center">
                        <input
                          type="checkbox"
                          checked={selectedHours.has(index)}
                          onChange={() => toggleHourSelection(index)}
                          className="w-3 h-3 rounded border-border"
                        />
                      </div>
                      <div
                        className={cn(
                          "col-span-2 text-sm font-mono",
                          isCoreHour(assignment.hour) ? "text-primary font-medium" : "text-muted-foreground",
                          isWorkingHour(assignment.hour) && "font-medium text-foreground",
                        )}
                      >
                        {assignment.hour.toString().padStart(2, "0")}:00
                        {isCoreHour(assignment.hour) && <span className="ml-1 text-xs text-primary">●</span>}
                      </div>
                      <div className="col-span-4">
                        <Select
                          value={assignment.projectId?.toString() || ""}
                          onValueChange={(value) => updateHourAssignment(index, "projectId", value ? Number(value) : undefined)}
                          disabled={!isWorkingHour(assignment.hour)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((proj) => (
                              <SelectItem key={proj.id} value={proj.id!.toString()}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
                                  {proj.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-5">
                        <Input
                          placeholder="Description"
                          value={assignment.description}
                          onChange={(e) => updateHourAssignment(index, "description", e.target.value)}
                          className="h-8 text-sm"
                          disabled={!isWorkingHour(assignment.hour)}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="text-xs font-medium text-primary mb-2 mt-4 sticky top-0 bg-muted/20 py-1 flex items-center gap-2">
                    <span className="text-primary">●</span>
                    Core Hours ({companySettings?.core_hours_start || 9}:00 - {companySettings?.core_hours_end || 17}
                    :00)
                  </div>
                  {hourAssignments.slice(9, 18).map((assignment, index) => {
                    const actualIndex = index + 9
                    return (
                      <div
                        key={actualIndex}
                        className={cn(
                          "grid grid-cols-12 gap-2 items-center py-1 px-2 rounded",
                          !isWorkingHour(assignment.hour) && "opacity-40",
                          isCoreHour(assignment.hour) && "bg-primary/10 border border-primary/20",
                        )}
                      >
                        <div className="col-span-1 flex justify-center">
                          <input
                            type="checkbox"
                            checked={selectedHours.has(actualIndex)}
                            onChange={() => toggleHourSelection(actualIndex)}
                            className="w-3 h-3 rounded border-border"
                          />
                        </div>
                        <div
                          className={cn(
                            "col-span-2 text-sm font-mono",
                            isCoreHour(assignment.hour) ? "text-primary font-medium" : "text-muted-foreground",
                            isWorkingHour(assignment.hour) && "font-medium text-foreground",
                          )}
                        >
                          {assignment.hour.toString().padStart(2, "0")}:00
                          {isCoreHour(assignment.hour) && <span className="ml-1 text-xs text-primary">●</span>}
                        </div>
                        <div className="col-span-4">
                          <Select
                            value={assignment.projectId?.toString() || ""}
                            onValueChange={(value) => updateHourAssignment(actualIndex, "projectId", value ? Number(value) : undefined)}
                            disabled={!isWorkingHour(assignment.hour)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((proj) => (
                                <SelectItem key={proj.id} value={proj.id!.toString()}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
                                    {proj.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-5">
                          <Input
                            placeholder="Description"
                            value={assignment.description}
                            onChange={(e) => updateHourAssignment(actualIndex, "description", e.target.value)}
                            className="h-8 text-sm"
                            disabled={!isWorkingHour(assignment.hour)}
                          />
                        </div>
                      </div>
                    )
                  })}

                  <div className="text-xs font-medium text-muted-foreground mb-2 mt-4 sticky top-0 bg-muted/20 py-1">
                    Evening Hours (18:00 - 23:59)
                  </div>
                  {hourAssignments.slice(18, 24).map((assignment, index) => {
                    const actualIndex = index + 18
                    return (
                      <div
                        key={actualIndex}
                        className={cn(
                          "grid grid-cols-12 gap-2 items-center py-1 px-2 rounded",
                          !isWorkingHour(assignment.hour) && "opacity-40",
                          isCoreHour(assignment.hour) && "bg-primary/10 border border-primary/20",
                        )}
                      >
                        <div className="col-span-1 flex justify-center">
                          <input
                            type="checkbox"
                            checked={selectedHours.has(actualIndex)}
                            onChange={() => toggleHourSelection(actualIndex)}
                            className="w-3 h-3 rounded border-border"
                          />
                        </div>
                        <div
                          className={cn(
                            "col-span-2 text-sm font-mono",
                            isCoreHour(assignment.hour) ? "text-primary font-medium" : "text-muted-foreground",
                            isWorkingHour(assignment.hour) && "font-medium text-foreground",
                          )}
                        >
                          {assignment.hour.toString().padStart(2, "0")}:00
                          {isCoreHour(assignment.hour) && <span className="ml-1 text-xs text-primary">●</span>}
                        </div>
                        <div className="col-span-4">
                          <Select
                            value={assignment.projectId?.toString() || ""}
                            onValueChange={(value) => updateHourAssignment(actualIndex, "projectId", value ? Number(value) : undefined)}
                            disabled={!isWorkingHour(assignment.hour)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((proj) => (
                                <SelectItem key={proj.id} value={proj.id!.toString()}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
                                    {proj.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-5">
                          <Input
                            placeholder="Description"
                            value={assignment.description}
                            onChange={(e) => updateHourAssignment(actualIndex, "description", e.target.value)}
                            className="h-8 text-sm"
                            disabled={!isWorkingHour(assignment.hour)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={handleBulkAdd} disabled={isLoading} className="flex-1">
              {isLoading ? "Adding..." : "Add Entries"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
