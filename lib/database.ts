// Database utility functions for time tracking
// This file now uses PostgreSQL backend instead of IndexedDB

export interface TimeEntry {
  id?: number
  date: string // YYYY-MM-DD format
  startHour: number // 0-23 (renamed from start_hour for consistency)
  endHour: number // 0-23 (renamed from end_hour for consistency)
  duration: number // hours (can be fractional)
  projectId?: number | null // Project ID reference
  project?: string | null // Denormalized project name for display/export
  billableRate?: number // Per-entry billable rate
  description?: string
  createdAt?: string
  updatedAt?: string
}

export interface Project {
  id?: number
  name: string
  color: string
  defaultBillableRate?: number | null
  isActive?: boolean
  createdAt?: string
}

export interface CompanySettings {
  coreStartTime: string
  coreEndTime: string
  workingDays: string[]
  companyName: string
  timezone: string
  weekStartsOn: 'saturday' | 'sunday' | 'monday'
}

export interface UserSettings {
  firstName: string
  lastName: string
  defaultBillableRate?: number // Default billable rate
  currency: string // Currency for billing (USD, EUR, GBP, CAD, AUD, CHF)
}

// API client functions
class DatabaseClient {
  // Time entries methods
  async getTimeEntries(startDate?: string, endDate?: string): Promise<TimeEntry[]> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    
    const response = await fetch(`/api/time-entries?${params}`)
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch time entries')
    }
    
    return result.data
  }

  async addTimeEntry(entry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimeEntry> {
    const response = await fetch('/api/time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create time entry')
    }
    
    return result.data
  }

  async updateTimeEntry(id: number, updates: Partial<TimeEntry>): Promise<TimeEntry> {
    const response = await fetch(`/api/time-entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update time entry')
    }
    
    return result.data
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    const response = await fetch(`/api/time-entries/${id}`, {
      method: 'DELETE',
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete time entry')
    }
    
    return true
  }

  async batchUpdateTimeEntries(
    entryIds: number[], 
    updates: { billableRate?: number; projectId?: number; description?: string }
  ): Promise<number> {
    const response = await fetch('/api/time-entries/batch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryIds, updates }),
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to batch update time entries')
    }
    
    return result.data.updatedCount
  }

  // Projects methods
  async getProjects(): Promise<Project[]> {
    const response = await fetch('/api/projects')
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch projects')
    }
    
    return result.data
  }

  async addProject(project: Omit<Project, 'id' | 'isActive' | 'createdAt'>): Promise<Project> {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create project')
    }
    
    return result.data
  }

  async updateProject(id: number, updates: { name?: string; color?: string; defaultBillableRate?: number | null }): Promise<Project> {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update project')
    }
    
    return result.data
  }

  async deleteProject(id: number): Promise<boolean> {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete project')
    }
    
    return true
  }

  // Settings methods
  async getCompanySettings(): Promise<CompanySettings> {
    const response = await fetch('/api/settings')
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch settings')
    }
    
    return result.data.company
  }

  async saveCompanySettings(settings: CompanySettings): Promise<void> {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: settings }),
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save company settings')
    }
  }

  async getUserSettings(): Promise<UserSettings> {
    const response = await fetch('/api/settings')
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch settings')
    }
    
    return result.data.user
  }

  async saveUserSettings(settings: UserSettings): Promise<void> {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: settings }),
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save user settings')
    }
  }

  // Analytics methods
  async getDailyHours(date: string): Promise<number> {
    const entries = await this.getTimeEntries(date, date)
    return entries.reduce((total, entry) => total + entry.duration, 0)
  }

  async getWeeklyHours(startDate: string, endDate: string): Promise<{ [date: string]: number }> {
    const entries = await this.getTimeEntries(startDate, endDate)
    const dailyHours: { [date: string]: number } = {}

    entries.forEach((entry) => {
      dailyHours[entry.date] = (dailyHours[entry.date] || 0) + entry.duration
    })

    return dailyHours
  }

  // Data management - for compatibility but not implemented 
  async clearAllData(): Promise<void> {
    console.warn('clearAllData is not implemented for PostgreSQL backend')
    // This would require a special API endpoint or admin action
    throw new Error('Clear all data is not available - please manage data through the database')
  }
}

// Export singleton instance
export const db = new DatabaseClient()

// Export helper functions for backward compatibility
export async function getCompanySettings(): Promise<CompanySettings> {
  return await db.getCompanySettings()
}

export async function saveCompanySettings(settings: CompanySettings): Promise<void> {
  await db.saveCompanySettings(settings)
}

export async function getUserSettings(): Promise<UserSettings> {
  return await db.getUserSettings()
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  await db.saveUserSettings(settings)
}
