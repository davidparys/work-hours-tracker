"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Database, Download, Upload, Trash2, AlertTriangle } from "lucide-react"
import { db } from "@/lib/database"
import { formatHours } from "@/lib/utils/date-helpers"
import { StorageStatus } from "./storage-status"

interface DataManagerProps {
  children: React.ReactNode
  onDataChange?: () => void
}

export function DataManager({ children, onDataChange }: DataManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importData, setImportData] = useState("")
  const [stats, setStats] = useState<{
    totalEntries: number
    totalHours: number
    totalProjects: number
    dateRange: { start: string; end: string } | null
  } | null>(null)

  const loadStats = async () => {
    try {
      const [entries, projects] = await Promise.all([db.getTimeEntries(), db.getProjects()])

      const totalHours = entries.reduce((sum, entry) => sum + entry.duration, 0)
      const dates = entries.map((e) => e.date).sort()
      const dateRange = dates.length > 0 ? { start: dates[0], end: dates[dates.length - 1] } : null

      setStats({
        totalEntries: entries.length,
        totalHours,
        totalProjects: projects.length,
        dateRange,
      })
    } catch (error) {
      console.error("Failed to load stats:", error)
    }
  }

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const [entries, projects] = await Promise.all([db.getTimeEntries(), db.getProjects()])

      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        data: {
          timeEntries: entries,
          projects: projects,
        },
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `timetracker-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export failed:", error)
      alert("Export failed. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportData = async () => {
    if (!importData.trim()) {
      alert("Please paste your backup data")
      return
    }

    setIsImporting(true)
    try {
      const parsed = JSON.parse(importData)

      if (!parsed.data || !parsed.data.timeEntries || !parsed.data.projects) {
        throw new Error("Invalid backup format")
      }

      // Import projects first
      for (const project of parsed.data.projects) {
        await db.addProject({
          name: project.name,
          color: project.color,
        })
      }

      // Import time entries
      for (const entry of parsed.data.timeEntries) {
        await db.addTimeEntry({
          date: entry.date,
          start_hour: entry.start_hour,
          end_hour: entry.end_hour,
          duration: entry.duration,
          project: entry.project,
          description: entry.description,
        })
      }

      alert(
        `Successfully imported ${parsed.data.timeEntries.length} entries and ${parsed.data.projects.length} projects`,
      )
      setImportData("")
      onDataChange?.()
      await loadStats()
    } catch (error) {
      console.error("Import failed:", error)
      alert("Import failed. Please check your data format and try again.")
    } finally {
      setIsImporting(false)
    }
  }

  const handleClearAllData = async () => {
    const confirmed = confirm(
      'Are you sure you want to delete ALL time tracking data? This action cannot be undone.\n\nType "DELETE" to confirm.',
    )

    if (!confirmed) return

    const doubleConfirm = prompt('Type "DELETE" to confirm deletion of all data:')
    if (doubleConfirm !== "DELETE") {
      alert("Deletion cancelled")
      return
    }

    try {
      await db.clearAllData()
      alert("All data has been cleared")
      onDataChange?.()
      await loadStats()
    } catch (error) {
      console.error("Clear data failed:", error)
      alert("Failed to clear data. Please try again.")
    }
  }

  const handleOpenDialog = () => {
    setIsOpen(true)
    loadStats()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={handleOpenDialog}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Storage Status */}
          <StorageStatus />

          {/* Statistics */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.totalEntries}</div>
                    <div className="text-sm text-muted-foreground">Time Entries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{formatHours(stats.totalHours)}</div>
                    <div className="text-sm text-muted-foreground">Total Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.totalProjects}</div>
                    <div className="text-sm text-muted-foreground">Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-primary">
                      {stats.dateRange ? `${stats.dateRange.start} to ${stats.dateRange.end}` : "No data"}
                    </div>
                    <div className="text-sm text-muted-foreground">Date Range</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Download a complete backup of your time tracking data in JSON format. This includes all time entries and
                projects.
              </p>
              <Button onClick={handleExportData} disabled={isExporting} className="gap-2">
                <Download className="h-4 w-4" />
                {isExporting ? "Exporting..." : "Export Backup"}
              </Button>
            </CardContent>
          </Card>

          {/* Import Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Import Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Restore data from a previous backup. Paste the JSON content from your backup file below.
              </p>
              <div className="space-y-2">
                <Label>Backup Data (JSON)</Label>
                <Textarea
                  placeholder="Paste your backup JSON data here..."
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
              <Button onClick={handleImportData} disabled={isImporting || !importData.trim()} className="gap-2">
                <Upload className="h-4 w-4" />
                {isImporting ? "Importing..." : "Import Data"}
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Permanently delete all time tracking data. This action cannot be undone.
              </p>
              <Button variant="destructive" onClick={handleClearAllData} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear All Data
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
