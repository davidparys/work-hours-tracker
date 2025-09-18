// Database utility functions for time tracking
export interface TimeEntry {
  id?: number
  date: string // YYYY-MM-DD format
  start_hour: number // 0-23
  end_hour: number // 0-23
  duration: number // hours (can be fractional)
  project?: string
  description?: string
  created_at?: string
  updated_at?: string
}

export interface Project {
  id?: number
  name: string
  color: string
  created_at?: string
}

export interface CompanySettings {
  coreStartTime: string
  coreEndTime: string
  workingDays: string[]
  companyName: string
  timezone: string
}

// In-memory storage for demo purposes (replace with actual database later)
const timeEntries: TimeEntry[] = []
const projects: Project[] = [
  { id: 1, name: "Development", color: "#164e63" },
  { id: 2, name: "Meetings", color: "#10b981" },
  { id: 3, name: "Research", color: "#0891b2" },
  { id: 4, name: "Documentation", color: "#4b5563" },
]

let companySettings: CompanySettings = {
  coreStartTime: "09:00",
  coreEndTime: "17:00",
  workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  companyName: "My Company",
  timezone: "UTC",
}

export const db = {
  // Time entries
  async getTimeEntries(startDate?: string, endDate?: string): Promise<TimeEntry[]> {
    let filtered = timeEntries
    if (startDate) {
      filtered = filtered.filter((entry) => entry.date >= startDate)
    }
    if (endDate) {
      filtered = filtered.filter((entry) => entry.date <= endDate)
    }
    return filtered.sort((a, b) => a.date.localeCompare(b.date))
  },

  async addTimeEntry(entry: Omit<TimeEntry, "id" | "created_at" | "updated_at">): Promise<TimeEntry> {
    const newEntry: TimeEntry = {
      ...entry,
      id: timeEntries.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    timeEntries.push(newEntry)
    return newEntry
  },

  async updateTimeEntry(id: number, updates: Partial<TimeEntry>): Promise<TimeEntry | null> {
    const index = timeEntries.findIndex((entry) => entry.id === id)
    if (index === -1) return null

    timeEntries[index] = {
      ...timeEntries[index],
      ...updates,
      updated_at: new Date().toISOString(),
    }
    return timeEntries[index]
  },

  async deleteTimeEntry(id: number): Promise<boolean> {
    const index = timeEntries.findIndex((entry) => entry.id === id)
    if (index === -1) return false

    timeEntries.splice(index, 1)
    return true
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    return projects
  },

  async addProject(project: Omit<Project, "id" | "created_at">): Promise<Project> {
    const newProject: Project = {
      ...project,
      id: projects.length + 1,
      created_at: new Date().toISOString(),
    }
    projects.push(newProject)
    return newProject
  },

  // Analytics
  async getDailyHours(date: string): Promise<number> {
    const entries = await this.getTimeEntries(date, date)
    return entries.reduce((total, entry) => total + entry.duration, 0)
  },

  async getWeeklyHours(startDate: string, endDate: string): Promise<{ [date: string]: number }> {
    const entries = await this.getTimeEntries(startDate, endDate)
    const dailyHours: { [date: string]: number } = {}

    entries.forEach((entry) => {
      dailyHours[entry.date] = (dailyHours[entry.date] || 0) + entry.duration
    })

    return dailyHours
  },

  // Company Settings
  async getCompanySettings(): Promise<any> {
    return {
      core_hours_start: Number.parseInt(companySettings.coreStartTime.split(":")[0]),
      core_hours_end: Number.parseInt(companySettings.coreEndTime.split(":")[0]),
      working_days: companySettings.workingDays,
      company_name: companySettings.companyName,
      timezone: companySettings.timezone,
    }
  },

  async saveCompanySettings(settings: any): Promise<void> {
    companySettings = {
      coreStartTime: `${settings.core_hours_start.toString().padStart(2, "0")}:00`,
      coreEndTime: `${settings.core_hours_end.toString().padStart(2, "0")}:00`,
      workingDays: settings.working_days,
      companyName: settings.company_name,
      timezone: settings.timezone,
    }
  },
}

export async function getCompanySettings(): Promise<CompanySettings> {
  return companySettings
}

export async function saveCompanySettings(settings: CompanySettings): Promise<void> {
  companySettings = { ...settings }
}
