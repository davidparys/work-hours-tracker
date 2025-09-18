"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Clock, Plus, Trash2, Zap, LayoutGrid, List } from "lucide-react"
import { type TimeEntry, type Project, db } from "@/lib/database"
import { formatDate, formatHours } from "@/lib/utils/date-helpers"
import { cn } from "@/lib/utils"
import { BulkEntryDialog } from "./bulk-entry-dialog"

interface DayViewProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export function DayView({ selectedDate, onDateChange }: DayViewProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isAddingEntry, setIsAddingEntry] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("timeline")
  const [newEntry, setNewEntry] = useState({
    start_hour: 9,
    end_hour: 10,
    project: "",
    description: "",
  })

  const dateString = formatDate(selectedDate)
  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.duration, 0)

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = async () => {
    const [entries, projectList] = await Promise.all([db.getTimeEntries(dateString, dateString), db.getProjects()])
    setTimeEntries(entries)
    setProjects(projectList)
  }

  const handleAddEntry = async () => {
    if (newEntry.start_hour >= newEntry.end_hour) {
      alert("End time must be after start time")
      return
    }

    const duration = newEntry.end_hour - newEntry.start_hour
    const entry = await db.addTimeEntry({
      date: dateString,
      start_hour: newEntry.start_hour,
      end_hour: newEntry.end_hour,
      duration,
      project: newEntry.project || undefined,
      description: newEntry.description || undefined,
    })

    setTimeEntries([...timeEntries, entry])
    setIsAddingEntry(false)
    setNewEntry({ start_hour: 9, end_hour: 10, project: "", description: "" })
  }

  const handleDeleteEntry = async (id: number) => {
    await db.deleteTimeEntry(id)
    setTimeEntries(timeEntries.filter((entry) => entry.id !== id))
  }

  const getHourStatus = (hour: number): "free" | "busy" => {
    const overlapping = timeEntries.filter((entry) => hour >= entry.start_hour && hour < entry.end_hour)
    return overlapping.length > 0 ? "busy" : "free"
  }

  const getProjectColor = (projectName?: string): string => {
    if (!projectName) return "#6b7280"
    const project = projects.find((p) => p.name === projectName)
    return project?.color || "#6b7280"
  }

  const renderWorkHoursGrid = () => {
    const allHours = Array.from({ length: 24 }, (_, i) => i)
    const workHourStart = 9
    const workHourEnd = 18

    return (
      <div className="space-y-4">
        {/* Work Hours Section */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 px-1">Core Work Hours</div>
          <div className="grid grid-cols-10 gap-2 p-3 bg-muted/20 rounded-lg border border-border/30">
            {allHours.slice(workHourStart, workHourEnd).map((hour) => {
              const status = getHourStatus(hour)
              const entry = timeEntries.find((e) => hour >= e.start_hour && hour < e.end_hour)

              return (
                <div
                  key={hour}
                  className={cn(
                    "aspect-square rounded-md border text-xs flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105",
                    status === "free" && "bg-background hover:bg-muted border-border/50",
                    status === "busy" && "text-white border-transparent shadow-sm",
                  )}
                  style={{
                    backgroundColor: status === "busy" ? getProjectColor(entry?.project) : undefined,
                  }}
                  title={`${hour}:00 - ${entry ? `${entry.project || "Work"}: ${entry.description || "No description"}` : "Available"}`}
                >
                  <span className="font-mono text-xs font-medium">{hour}</span>
                  {entry && (
                    <span className="text-[10px] opacity-90 truncate w-full text-center">
                      {entry.project?.slice(0, 2) || "W"}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Extended Hours Section */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 px-1">Extended Hours</div>
          <div className="grid grid-cols-12 gap-1">
            {/* Early Hours (0-8) */}
            {allHours.slice(0, workHourStart).map((hour) => {
              const status = getHourStatus(hour)
              const entry = timeEntries.find((e) => hour >= e.start_hour && hour < e.end_hour)

              return (
                <div
                  key={hour}
                  className={cn(
                    "aspect-square rounded border text-xs flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 opacity-75",
                    status === "free" && "bg-muted/30 hover:bg-muted/50 border-border/30",
                    status === "busy" && "text-white border-transparent shadow-sm opacity-100",
                  )}
                  style={{
                    backgroundColor: status === "busy" ? getProjectColor(entry?.project) : undefined,
                  }}
                  title={`${hour}:00 - ${entry ? `${entry.project || "Work"}: ${entry.description || "No description"}` : "Available"}`}
                >
                  <span className="font-mono text-[10px] font-medium">{hour}</span>
                </div>
              )
            })}

            {/* Late Hours (18-23) */}
            {allHours.slice(workHourEnd).map((hour) => {
              const status = getHourStatus(hour)
              const entry = timeEntries.find((e) => hour >= e.start_hour && hour < e.end_hour)

              return (
                <div
                  key={hour}
                  className={cn(
                    "aspect-square rounded border text-xs flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 opacity-75",
                    status === "free" && "bg-muted/30 hover:bg-muted/50 border-border/30",
                    status === "busy" && "text-white border-transparent shadow-sm opacity-100",
                  )}
                  style={{
                    backgroundColor: status === "busy" ? getProjectColor(entry?.project) : undefined,
                  }}
                  title={`${hour}:00 - ${entry ? `${entry.project || "Work"}: ${entry.description || "No description"}` : "Available"}`}
                >
                  <span className="font-mono text-[10px] font-medium">{hour}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderTimelineView = () => {
    const allHours = Array.from({ length: 24 }, (_, i) => i)
    const workHourStart = 9
    const workHourEnd = 18

    return (
      <div className="space-y-4">
        {/* Early Hours */}
        {allHours.slice(0, workHourStart).length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 px-1">Early Hours</div>
            <div className="space-y-1 opacity-75">
              {allHours.slice(0, workHourStart).map((hour) => {
                const entry = timeEntries.find((e) => hour >= e.start_hour && hour < e.end_hour)
                const isOccupied = !!entry

                return (
                  <div
                    key={hour}
                    className={cn(
                      "flex items-center gap-4 p-2 rounded border transition-colors",
                      isOccupied ? "bg-card border-border opacity-100" : "bg-muted/20 border-border/30",
                    )}
                  >
                    <div className="w-12 text-xs font-mono text-muted-foreground">
                      {hour.toString().padStart(2, "0")}:00
                    </div>
                    {isOccupied && entry ? (
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getProjectColor(entry.project) }}
                          />
                          <span className="text-sm font-medium">{entry.project || "Work"}</span>
                          {entry.description && (
                            <span className="text-xs text-muted-foreground">• {entry.description}</span>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {formatHours(entry.duration)}
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex-1 text-xs text-muted-foreground">Available</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Core Work Hours */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 px-1">Core Work Hours</div>
          <div className="space-y-1 p-3 bg-muted/20 rounded-lg border border-border/30">
            {allHours.slice(workHourStart, workHourEnd).map((hour) => {
              const entry = timeEntries.find((e) => hour >= e.start_hour && hour < e.end_hour)
              const isOccupied = !!entry

              return (
                <div
                  key={hour}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                    isOccupied ? "bg-background border-border" : "bg-background/50 border-border/50",
                  )}
                >
                  <div className="w-16 text-sm font-mono text-muted-foreground">
                    {hour.toString().padStart(2, "0")}:00
                  </div>

                  {isOccupied && entry ? (
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getProjectColor(entry.project) }}
                        />
                        <span className="font-medium">{entry.project || "Work"}</span>
                        {entry.description && (
                          <span className="text-sm text-muted-foreground">• {entry.description}</span>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {formatHours(entry.duration)}
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex-1 text-sm text-muted-foreground">Available</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Late Hours */}
        {allHours.slice(workHourEnd).length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 px-1">Late Hours</div>
            <div className="space-y-1 opacity-75">
              {allHours.slice(workHourEnd).map((hour) => {
                const entry = timeEntries.find((e) => hour >= e.start_hour && hour < e.end_hour)
                const isOccupied = !!entry

                return (
                  <div
                    key={hour}
                    className={cn(
                      "flex items-center gap-4 p-2 rounded border transition-colors",
                      isOccupied ? "bg-card border-border opacity-100" : "bg-muted/20 border-border/30",
                    )}
                  >
                    <div className="w-12 text-xs font-mono text-muted-foreground">
                      {hour.toString().padStart(2, "0")}:00
                    </div>
                    {isOccupied && entry ? (
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getProjectColor(entry.project) }}
                          />
                          <span className="text-sm font-medium">{entry.project || "Work"}</span>
                          {entry.description && (
                            <span className="text-xs text-muted-foreground">• {entry.description}</span>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {formatHours(entry.duration)}
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex-1 text-xs text-muted-foreground">Available</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-balance">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {formatHours(totalHours)} logged • {timeEntries.length} entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000))}
          >
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
          >
            Next
          </Button>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Daily Schedule (Work Hours Emphasized)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "timeline" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("timeline")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "grid" ? renderWorkHoursGrid() : renderTimelineView()}

          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-muted/50 border border-border/50 rounded" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded" />
              <span>Scheduled</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Time Entries</CardTitle>
            <div className="flex gap-2">
              <BulkEntryDialog projects={projects} onEntriesAdded={loadData}>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Zap className="h-4 w-4" />
                  Bulk Add
                </Button>
              </BulkEntryDialog>
              <Button onClick={() => setIsAddingEntry(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Entry
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAddingEntry && (
            <Card className="border-dashed border-border/50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Time</label>
                    <Select
                      value={newEntry.start_hour.toString()}
                      onValueChange={(value) => setNewEntry({ ...newEntry, start_hour: Number.parseInt(value) })}
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
                      value={newEntry.end_hour.toString()}
                      onValueChange={(value) => setNewEntry({ ...newEntry, end_hour: Number.parseInt(value) })}
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

                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Project</label>
                  <Select
                    value={newEntry.project}
                    onValueChange={(value) => setNewEntry({ ...newEntry, project: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.name}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                            {project.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    placeholder="What did you work on?"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddEntry} size="sm">
                    Add Entry
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddingEntry(false)} size="sm">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {timeEntries.length === 0 && !isAddingEntry ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No time entries for this day</p>
              <p className="text-sm">Click "Add Entry" or "Bulk Add" to start tracking</p>
            </div>
          ) : (
            <div className="space-y-2">
              {timeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-mono text-muted-foreground">
                      {entry.start_hour.toString().padStart(2, "0")}:00 - {entry.end_hour.toString().padStart(2, "0")}
                      :00
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getProjectColor(entry.project) }}
                      />
                      {formatHours(entry.duration)}
                    </Badge>
                    {entry.project && <Badge variant="outline">{entry.project}</Badge>}
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.description && (
                      <span className="text-sm text-muted-foreground max-w-xs truncate">{entry.description}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEntry(entry.id!)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
