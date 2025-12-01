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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User } from "lucide-react"
import { getUserSettings, saveUserSettings } from "@/lib/database"

interface PersonalSettingsProps {
  children: React.ReactNode
  onSettingsChange?: () => void
}

interface UserSettings {
  firstName: string
  lastName: string
  defaultBillableRate?: number
  currency: string
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'NZD', symbol: '$', name: 'New Zealand Dollar' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'SGD', symbol: '$', name: 'Singapore Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
]

export function PersonalSettings({ children, onSettingsChange }: PersonalSettingsProps) {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<UserSettings>({
    firstName: "",
    lastName: "",
    defaultBillableRate: undefined,
    currency: "USD",
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    try {
      const savedSettings = await getUserSettings()
      if (savedSettings) {
        setSettings(savedSettings)
      }
    } catch (error) {
      console.error("Failed to load personal settings:", error)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await saveUserSettings(settings)
      onSettingsChange?.()
      setOpen(false)
    } catch (error) {
      console.error("Failed to save personal settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Personal Details
          </DialogTitle>
          <DialogDescription>
            Configure your personal information for reports and exports.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Personal Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Personal Information</CardTitle>
              <CardDescription className="text-xs">
                This information will be used in reports and exports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={settings.firstName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={settings.lastName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter your last name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={settings.currency}
                  onValueChange={(value) => setSettings((prev) => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <span className="flex items-center gap-2">
                          <span className="font-mono w-6">{currency.symbol}</span>
                          <span>{currency.name} ({currency.code})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Currency used for billable amounts in reports
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billableRate">Default Billable Rate (per hour)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {CURRENCIES.find(c => c.code === settings.currency)?.symbol || '$'}
                  </span>
                  <Input
                    id="billableRate"
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-7"
                    value={settings.defaultBillableRate || ""}
                    onChange={(e) => setSettings((prev) => ({ 
                      ...prev, 
                      defaultBillableRate: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This rate will be used by default for new time entries
                </p>
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














