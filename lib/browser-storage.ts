// Browser storage implementation using IndexedDB
// This provides persistent storage in the browser for the work hours tracker

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
  weekStartsOn: 'saturday' | 'sunday' | 'monday'
}

export interface UserSettings {
  firstName: string
  lastName: string
}

const DB_NAME = 'WorkHoursTracker'
const DB_VERSION = 2

// IndexedDB wrapper class
class BrowserStorage {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const oldVersion = event.oldVersion

        // Create time_entries store
        if (!db.objectStoreNames.contains('time_entries')) {
          const timeEntriesStore = db.createObjectStore('time_entries', { keyPath: 'id', autoIncrement: true })
          timeEntriesStore.createIndex('date', 'date', { unique: false })
          timeEntriesStore.createIndex('project', 'project', { unique: false })
        }

        // Create projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectsStore = db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true })
          projectsStore.createIndex('name', 'name', { unique: true })
        }

        // Create company_settings store
        if (!db.objectStoreNames.contains('company_settings')) {
          db.createObjectStore('company_settings', { keyPath: 'id' })
        }

        // Create user_settings store (added in version 2)
        if (oldVersion < 2 && !db.objectStoreNames.contains('user_settings')) {
          db.createObjectStore('user_settings', { keyPath: 'id' })
        }
      }
    })
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    return this.db!
  }

  // Generic CRUD operations
  private async add<T>(storeName: string, data: Omit<T, 'id'>): Promise<T> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.add(data)

      request.onsuccess = () => {
        const newData = { ...data, id: request.result } as T
        resolve(newData)
      }
      request.onerror = () => reject(request.error)
    })
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  private async update<T>(storeName: string, id: number, updates: Partial<T>): Promise<T | null> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      
      // First get the existing record
      const getRequest = store.get(id)
      getRequest.onsuccess = () => {
        const existing = getRequest.result
        if (!existing) {
          resolve(null)
          return
        }

        const updated = { ...existing, ...updates }
        const putRequest = store.put(updated)
        putRequest.onsuccess = () => resolve(updated)
        putRequest.onerror = () => reject(putRequest.error)
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  private async delete(storeName: string, id: number): Promise<boolean> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  }

  private async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Time entries methods
  async getTimeEntries(startDate?: string, endDate?: string): Promise<TimeEntry[]> {
    const allEntries = await this.getAll<TimeEntry>('time_entries')
    
    let filtered = allEntries
    if (startDate) {
      filtered = filtered.filter((entry) => entry.date >= startDate)
    }
    if (endDate) {
      filtered = filtered.filter((entry) => entry.date <= endDate)
    }
    
    return filtered.sort((a, b) => a.date.localeCompare(b.date))
  }

  async addTimeEntry(entry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>): Promise<TimeEntry> {
    const newEntry = {
      ...entry,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return this.add<TimeEntry>('time_entries', newEntry)
  }

  async updateTimeEntry(id: number, updates: Partial<TimeEntry>): Promise<TimeEntry | null> {
    const updated = {
      ...updates,
      updated_at: new Date().toISOString(),
    }
    return this.update<TimeEntry>('time_entries', id, updated)
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    return this.delete('time_entries', id)
  }

  // Projects methods
  async getProjects(): Promise<Project[]> {
    const projects = await this.getAll<Project>('projects')
    
    // If no projects exist, create default ones
    if (projects.length === 0) {
      const defaultProjects = [
        { name: "Development", color: "#164e63" },
        { name: "Meetings", color: "#10b981" },
        { name: "Research", color: "#0891b2" },
        { name: "Documentation", color: "#4b5563" },
      ]
      
      for (const project of defaultProjects) {
        await this.addProject(project)
      }
      
      return await this.getAll<Project>('projects')
    }
    
    return projects
  }

  async addProject(project: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
    const newProject = {
      ...project,
      created_at: new Date().toISOString(),
    }
    return this.add<Project>('projects', newProject)
  }

  // Company settings methods
  async getCompanySettings(): Promise<CompanySettings> {
    const settings = await this.getAll<CompanySettings & { id: number }>('company_settings')
    
    if (settings.length === 0) {
      const defaultSettings: CompanySettings = {
        coreStartTime: "09:00",
        coreEndTime: "17:00",
        workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        companyName: "My Company",
        timezone: "UTC",
        weekStartsOn: "monday",
      }
      
      await this.saveCompanySettings(defaultSettings)
      return defaultSettings
    }
    
    const { id, ...settingsData } = settings[0]
    
    // Handle migration for existing settings that don't have weekStartsOn
    if (!settingsData.weekStartsOn) {
      settingsData.weekStartsOn = "monday"
      await this.saveCompanySettings(settingsData)
    }
    
    return settingsData
  }

  async saveCompanySettings(settings: CompanySettings): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['company_settings'], 'readwrite')
      const store = transaction.objectStore('company_settings')
      
      // Clear existing settings and add new ones
      const clearRequest = store.clear()
      clearRequest.onsuccess = () => {
        const addRequest = store.add({ id: 1, ...settings })
        addRequest.onsuccess = () => resolve()
        addRequest.onerror = () => reject(addRequest.error)
      }
      clearRequest.onerror = () => reject(clearRequest.error)
    })
  }

  // User settings methods
  async getUserSettings(): Promise<UserSettings> {
    const settings = await this.getAll<UserSettings & { id: number }>('user_settings')
    
    if (settings.length === 0) {
      const defaultSettings: UserSettings = {
        firstName: "",
        lastName: "",
      }
      
      await this.saveUserSettings(defaultSettings)
      return defaultSettings
    }
    
    const { id, ...settingsData } = settings[0]
    return settingsData
  }

  async saveUserSettings(settings: UserSettings): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['user_settings'], 'readwrite')
      const store = transaction.objectStore('user_settings')
      
      // Clear existing settings and add new ones
      const clearRequest = store.clear()
      clearRequest.onsuccess = () => {
        const addRequest = store.add({ id: 1, ...settings })
        addRequest.onsuccess = () => resolve()
        addRequest.onerror = () => reject(addRequest.error)
      }
      clearRequest.onerror = () => reject(clearRequest.error)
    })
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

  // Clear all data
  async clearAllData(): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['time_entries', 'projects', 'company_settings', 'user_settings'], 'readwrite')
      
      const clearTimeEntries = transaction.objectStore('time_entries').clear()
      const clearProjects = transaction.objectStore('projects').clear()
      const clearSettings = transaction.objectStore('company_settings').clear()
      const clearUserSettings = transaction.objectStore('user_settings').clear()
      
      let completed = 0
      const onComplete = () => {
        completed++
        if (completed === 4) {
          resolve()
        }
      }
      
      clearTimeEntries.onsuccess = onComplete
      clearProjects.onsuccess = onComplete
      clearSettings.onsuccess = onComplete
      clearUserSettings.onsuccess = onComplete
      
      clearTimeEntries.onerror = () => reject(clearTimeEntries.error)
      clearProjects.onerror = () => reject(clearProjects.error)
      clearSettings.onerror = () => reject(clearSettings.error)
      clearUserSettings.onerror = () => reject(clearUserSettings.error)
    })
  }
}

// Create singleton instance
const browserStorage = new BrowserStorage()

// Initialize the database
browserStorage.init().catch(console.error)

export { browserStorage as db }
