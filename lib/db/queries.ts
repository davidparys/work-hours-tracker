import { db, sql } from './client'
import { users, projects, timeEntries, companySettings, type SelectUser, type SelectProject, type SelectTimeEntry, type SelectCompanySettings } from './schema'
import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm'

// ============================================================================
// User Queries
// ============================================================================

export async function getOrCreateUser() {
  const existingUsers = await db.select().from(users).limit(1)
  
  if (existingUsers.length > 0) {
    return existingUsers[0]
  }
  
  // Create default user
  const [newUser] = await db.insert(users).values({
    firstName: '',
    lastName: '',
  }).returning()
  
  return newUser
}

export async function updateUser(updates: Partial<SelectUser>) {
  const user = await getOrCreateUser()
  const [updated] = await db.update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning()
  
  return updated
}

// ============================================================================
// Project Queries
// ============================================================================

export async function getAllProjects(): Promise<SelectProject[]> {
  const allProjects = await db.select().from(projects).where(eq(projects.isActive, true))
  
  // If no projects exist, create defaults
  if (allProjects.length === 0) {
    const defaultProjects = [
      { name: 'Development', color: '#164e63' },
      { name: 'Meetings', color: '#10b981' },
      { name: 'Research', color: '#0891b2' },
      { name: 'Documentation', color: '#4b5563' },
    ]
    
    for (const project of defaultProjects) {
      await createProject(project.name, project.color)
    }
    
    return await db.select().from(projects).where(eq(projects.isActive, true))
  }
  
  return allProjects
}

export async function createProject(name: string, color: string = '#164e63', defaultBillableRate?: number): Promise<SelectProject> {
  const [project] = await db.insert(projects).values({
    name,
    color,
    defaultBillableRate,
    isActive: true,
  }).returning()

  return project
}

export async function getProjectById(id: number): Promise<SelectProject | undefined> {
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  return project
}

export async function updateProject(id: number, updates: { name?: string; color?: string; defaultBillableRate?: number | null }): Promise<SelectProject> {
  const [updated] = await db.update(projects)
    .set({ ...updates })
    .where(eq(projects.id, id))
    .returning()

  return updated
}

export async function deleteProject(id: number): Promise<boolean> {
  // Soft delete by setting isActive to false
  await db.update(projects)
    .set({ isActive: false })
    .where(eq(projects.id, id))
  
  return true
}

// ============================================================================
// Time Entry Queries
// ============================================================================

export interface TimeEntryWithProject extends SelectTimeEntry {
  project?: string | null
}

export async function getTimeEntries(startDate?: string, endDate?: string): Promise<TimeEntryWithProject[]> {
  const conditions = []
  if (startDate) {
    conditions.push(gte(timeEntries.date, startDate))
  }
  if (endDate) {
    conditions.push(lte(timeEntries.date, endDate))
  }
  
  // Join with projects to get project names
  const query = db
    .select({
      id: timeEntries.id,
      userId: timeEntries.userId,
      projectId: timeEntries.projectId,
      date: timeEntries.date,
      startHour: timeEntries.startHour,
      endHour: timeEntries.endHour,
      duration: timeEntries.duration,
      billableRate: timeEntries.billableRate,
      description: timeEntries.description,
      createdAt: timeEntries.createdAt,
      updatedAt: timeEntries.updatedAt,
      project: projects.name,
    })
    .from(timeEntries)
    .leftJoin(projects, eq(timeEntries.projectId, projects.id))
    .orderBy(desc(timeEntries.date))
  
  if (conditions.length > 0) {
    const entries = await query.where(and(...conditions))
    return entries
  }
  
  const entries = await query
  return entries
}

export async function createTimeEntry(entry: {
  date: string
  startHour: number
  endHour: number
  duration: number
  projectId?: number
  billableRate?: number
  description?: string
}): Promise<SelectTimeEntry> {
  const user = await getOrCreateUser()
  
  const [newEntry] = await db.insert(timeEntries).values({
    userId: user.id,
    ...entry,
  }).returning()
  
  return newEntry
}

export async function updateTimeEntry(id: number, updates: Partial<SelectTimeEntry>): Promise<SelectTimeEntry> {
  const [updated] = await db.update(timeEntries)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(timeEntries.id, id))
    .returning()
  
  return updated
}

export async function deleteTimeEntry(id: number): Promise<boolean> {
  await db.delete(timeEntries).where(eq(timeEntries.id, id))
  return true
}

export async function batchUpdateTimeEntries(
  ids: number[], 
  updates: Partial<Pick<SelectTimeEntry, 'billableRate' | 'projectId' | 'description'>>
): Promise<number> {
  if (ids.length === 0) return 0
  
  const result = await db.update(timeEntries)
    .set({ ...updates, updatedAt: new Date() })
    .where(inArray(timeEntries.id, ids))
    .returning({ id: timeEntries.id })
  
  return result.length
}

// ============================================================================
// Company Settings Queries
// ============================================================================

export async function getCompanySettings(): Promise<SelectCompanySettings> {
  const settings = await db.select().from(companySettings).limit(1)
  
  if (settings.length === 0) {
    // Create default settings
    const [newSettings] = await db.insert(companySettings).values({
      coreStartTime: '09:00',
      coreEndTime: '17:00',
      workingDays: 'monday,tuesday,wednesday,thursday,friday',
      companyName: 'My Company',
      timezone: 'UTC',
      weekStartsOn: 'monday',
    }).returning()
    
    return newSettings
  }
  
  return settings[0]
}

export async function updateCompanySettings(updates: Partial<SelectCompanySettings>): Promise<SelectCompanySettings> {
  const existing = await getCompanySettings()
  
  const [updated] = await db.update(companySettings)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(companySettings.id, existing.id))
    .returning()
  
  return updated
}

// ============================================================================
// Analytics Queries
// ============================================================================

export async function getDailyHours(date: string): Promise<number> {
  const entries = await getTimeEntries(date, date)
  return entries.reduce((total, entry) => total + entry.duration, 0)
}

export async function getWeeklyHours(startDate: string, endDate: string): Promise<{ [date: string]: number }> {
  const entries = await getTimeEntries(startDate, endDate)
  const dailyHours: { [date: string]: number } = {}
  
  entries.forEach((entry) => {
    dailyHours[entry.date] = (dailyHours[entry.date] || 0) + entry.duration
  })
  
  return dailyHours
}
