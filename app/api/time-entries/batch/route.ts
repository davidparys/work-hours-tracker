import { NextRequest, NextResponse } from 'next/server'
import { batchUpdateTimeEntries } from '@/lib/db/queries'

// PATCH /api/time-entries/batch
// Batch update multiple time entries at once
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { entryIds, updates } = body

    if (!Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json(
        { error: 'entryIds must be a non-empty array', success: false },
        { status: 400 }
      )
    }

    // Validate that all IDs are numbers
    const validIds = entryIds.every((id: any) => typeof id === 'number' && !isNaN(id))
    if (!validIds) {
      return NextResponse.json(
        { error: 'All entry IDs must be valid numbers', success: false },
        { status: 400 }
      )
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates must be an object with fields to update', success: false },
        { status: 400 }
      )
    }

    // Only allow updating specific fields
    const allowedFields = ['billableRate', 'projectId', 'description']
    const updateFields: Record<string, any> = {}
    
    for (const field of allowedFields) {
      if (field in updates) {
        updateFields[field] = updates[field]
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided', success: false },
        { status: 400 }
      )
    }

    const updatedCount = await batchUpdateTimeEntries(entryIds, updateFields)

    return NextResponse.json({ 
      data: { updatedCount },
      success: true 
    })
  } catch (error: any) {
    console.error('Error batch updating time entries:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to batch update time entries', success: false },
      { status: 500 }
    )
  }
}

