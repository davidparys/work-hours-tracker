"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Building2, Calendar } from "lucide-react"
import { getCompanySettings, saveCompanySettings } from "@/lib/database"

interface CompanySettingsProps {
  children: React.ReactNode
  onSettingsChange?: () => void
}

interface CompanySettings {
  coreStartTime: string
  coreEndTime: string
  workingDays: string[]
  companyName: string
  timezone: string
  weekStartsOn: 'saturday' | 'sunday' | 'monday'
}

const DAYS_OF_WEEK = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
]

export function CompanySettings({ children, onSettingsChange }: CompanySettingsProps) {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<CompanySettings>({
    coreStartTime: "09:00",
    coreEndTime: "17:00",
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    companyName: "My Company",
    timezone: "UTC",
    weekStartsOn: "monday",
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    try {
      const savedSettings = await getCompanySettings()
      if (savedSettings) {
        setSettings(savedSettings)
      }
    } catch (error) {
      console.error("Failed to load company settings:", error)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await saveCompanySettings(settings)
      onSettingsChange?.()
      setOpen(false)
    } catch (error) {
      console.error("Failed to save company settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWorkingDayChange = (dayId: string, checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      workingDays: checked ? [...prev.workingDays, dayId] : prev.workingDays.filter((day) => day !== dayId),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Company Settings
          </DialogTitle>
          <DialogDescription>
            Configure your company's working hours and days for better time tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Company Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={settings.companyName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Enter company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={settings.timezone}
                  onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))}
                  placeholder="e.g., UTC, EST, PST"
                />
              </div>
            </CardContent>
          </Card>

          {/* Core Working Hours */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Core Working Hours
              </CardTitle>
              <CardDescription className="text-xs">
                These hours will be emphasized in the day view and used for bulk assignments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={settings.coreStartTime}
                    onChange={(e) => setSettings((prev) => ({ ...prev, coreStartTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={settings.coreEndTime}
                    onChange={(e) => setSettings((prev) => ({ ...prev, coreEndTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                Core hours: {settings.coreStartTime} - {settings.coreEndTime}(
                {Math.round(
                  (new Date(`2000-01-01T${settings.coreEndTime}`) - new Date(`2000-01-01T${settings.coreStartTime}`)) /
                    (1000 * 60 * 60),
                )}{" "}
                hours)
              </div>
            </CardContent>
          </Card>

          {/* Working Days */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Working Days
              </CardTitle>
              <CardDescription className="text-xs">
                Select which days are considered working days for bulk assignments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={day.id}
                      checked={settings.workingDays.includes(day.id)}
                      onCheckedChange={(checked) => handleWorkingDayChange(day.id, checked as boolean)}
                    />
                    <Label htmlFor={day.id} className="text-sm font-normal">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md mt-4">
                Selected: {settings.workingDays.length} days (
                {settings.workingDays.map((day) => DAYS_OF_WEEK.find((d) => d.id === day)?.label).join(", ")})
              </div>
            </CardContent>
          </Card>

          {/* Week Start Setting */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Week Starts On
              </CardTitle>
              <CardDescription className="text-xs">
                Choose which day the week starts on for all calendar views.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="weekStartsOn">First Day of Week</Label>
                <Select
                  value={settings.weekStartsOn || 'monday'}
                  onValueChange={(value: 'saturday' | 'sunday' | 'monday') =>
                    setSettings((prev) => ({ ...prev, weekStartsOn: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select week start day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saturday">Saturday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                    <SelectItem value="monday">Monday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md mt-4">
                Week will start on: {settings.weekStartsOn ? settings.weekStartsOn.charAt(0).toUpperCase() + settings.weekStartsOn.slice(1) : 'Monday'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
