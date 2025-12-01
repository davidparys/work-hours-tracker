import { NextRequest, NextResponse } from 'next/server'
import { getTimeEntries, createTimeEntry } from '@/lib/db/queries'

// GET /api/time-entries?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    
    const entries = await getTimeEntries(startDate, endDate)
    
    return NextResponse.json({ data: entries, success: true })
  } catch (error: any) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch time entries', success: false },
      { status: 500 }
    )
  }
}

// POST /api/time-entries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { date, startHour, endHour, duration, projectId, billableRate, description } = body
    
    // Validation
    if (!date || startHour === undefined || endHour === undefined || duration === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: date, startHour, endHour, duration', success: false },
        { status: 400 }
      )
    }
    
    const newEntry = await createTimeEntry({
      date,
      startHour: Number(startHour),
      endHour: Number(endHour),
      duration: Number(duration),
      projectId: projectId ? Number(projectId) : undefined,
      billableRate: billableRate ? Number(billableRate) : undefined,
      description,
    })
    
    return NextResponse.json({ data: newEntry, success: true }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating time entry:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create time entry', success: false },
      { status: 500 }
    )
  }
}
