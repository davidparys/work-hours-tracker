// Database utility functions for time tracking
// This file now uses browser storage (IndexedDB) for persistent data storage

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

// Import the browser storage implementation
import { db as browserDb } from './browser-storage'

// Export the browser storage as the main db interface
export const db = browserDb

// Legacy compatibility functions for company settings
export async function getCompanySettings(): Promise<CompanySettings> {
  return await browserDb.getCompanySettings()
}

export async function saveCompanySettings(settings: CompanySettings): Promise<void> {
  await browserDb.saveCompanySettings(settings)
}

// User settings functions
export async function getUserSettings(): Promise<UserSettings> {
  return await browserDb.getUserSettings()
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  await browserDb.saveUserSettings(settings)
}
