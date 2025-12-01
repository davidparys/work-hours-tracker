import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { users, projects, timeEntries, companySettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface MigrationData {
  timeEntries: Array<{
    date: string
    start_hour: number
    end_hour: number
    duration: number
    project?: string
    description?: string
  }>
  projects: Array<{
    name: string
    color: string
  }>
  userSettings: {
    firstName: string
    lastName: string
  }
  companySettings: {
    coreStartTime: string
    coreEndTime: string
    workingDays: string[]
    companyName: string
    timezone: string
    weekStartsOn: 'saturday' | 'sunday' | 'monday'
  }
}

// POST /api/migrate
export async function POST(request: NextRequest) {
  try {
    const body: MigrationData = await request.json()
    
    console.log('Starting migration...')
    console.log(`- ${body.timeEntries?.length || 0} time entries`)
    console.log(`- ${body.projects?.length || 0} projects`)
    
    // Step 1: Create or update user
    console.log('Migrating user settings...')
    const existingUsers = await db.select().from(users).limit(1)
    
    if (existingUsers.length > 0) {
      await db.update(users)
        .set({
          firstName: body.userSettings?.firstName || '',
          lastName: body.userSettings?.lastName || '',
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUsers[0].id))
    } else {
      await db.insert(users).values({
        firstName: body.userSettings?.firstName || '',
        lastName: body.userSettings?.lastName || '',
      })
    }
    
    // Step 2: Create or update company settings
    console.log('Migrating company settings...')
    const existingSettings = await db.select().from(companySettings).limit(1)
    
    if (existingSettings.length > 0) {
      await db.update(companySettings)
        .set({
          coreStartTime: body.companySettings?.coreStartTime || '09:00',
          coreEndTime: body.companySettings?.coreEndTime || '17:00',
          workingDays: body.companySettings?.workingDays?.join(',') || 'monday,tuesday,wednesday,thursday,friday',
          companyName: body.companySettings?.companyName || 'My Company',
          timezone: body.companySettings?.timezone || 'UTC',
          weekStartsOn: body.companySettings?.weekStartsOn || 'monday',
          updatedAt: new Date(),
        })
        .where(eq(companySettings.id, existingSettings[0].id))
    } else {
      await db.insert(companySettings).values({
        coreStartTime: body.companySettings?.coreStartTime || '09:00',
        coreEndTime: body.companySettings?.coreEndTime || '17:00',
        workingDays: body.companySettings?.workingDays?.join(',') || 'monday,tuesday,wednesday,thursday,friday',
        companyName: body.companySettings?.companyName || 'My Company',
        timezone: body.companySettings?.timezone || 'UTC',
        weekStartsOn: body.companySettings?.weekStartsOn || 'monday',
      })
    }
    
    // Step 3: Migrate projects and create name -> ID mapping
    console.log('Migrating projects...')
    const projectNameToId = new Map<string, number>()
    
    if (body.projects && body.projects.length > 0) {
      for (const project of body.projects) {
        // Check if project already exists
        const existing = await db.select()
          .from(projects)
          .where(eq(projects.name, project.name))
          .limit(1)
        
        if (existing.length > 0) {
          projectNameToId.set(project.name, existing[0].id)
        } else {
          const [newProject] = await db.insert(projects)
            .values({
              name: project.name,
              color: project.color,
              isActive: true,
            })
            .returning()
          
          projectNameToId.set(project.name, newProject.id)
        }
      }
    }
    
    // Step 4: Migrate time entries
    console.log('Migrating time entries...')
    let migratedCount = 0
    
    if (body.timeEntries && body.timeEntries.length > 0) {
      for (const entry of body.timeEntries) {
        // Map project name to project ID
        let projectId: number | undefined = undefined
        if (entry.project && projectNameToId.has(entry.project)) {
          projectId = projectNameToId.get(entry.project)
        }
        
        await db.insert(timeEntries).values({
          userId: 1, // Default user
          date: entry.date,
          startHour: entry.start_hour,
          endHour: entry.end_hour,
          duration: entry.duration,
          projectId,
          description: entry.description,
        })
        
        migratedCount++
      }
    }
    
    console.log(`Migration complete! Migrated ${migratedCount} time entries.`)
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      stats: {
        timeEntries: migratedCount,
        projects: projectNameToId.size,
      },
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Migration failed',
        success: false,
      },
      { status: 500 }
    )
  }
}
