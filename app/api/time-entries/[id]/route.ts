import { NextRequest, NextResponse } from 'next/server'
import { updateTimeEntry, deleteTimeEntry } from '@/lib/db/queries'

// PATCH /api/time-entries/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const entryId = Number(id)
    
    if (isNaN(entryId)) {
      return NextResponse.json(
        { error: 'Invalid entry ID', success: false },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    
    const updated = await updateTimeEntry(entryId, body)
    
    return NextResponse.json({ data: updated, success: true })
  } catch (error: any) {
    console.error('Error updating time entry:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update time entry', success: false },
      { status: 500 }
    )
  }
}

// DELETE /api/time-entries/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const entryId = Number(id)
    
    if (isNaN(entryId)) {
      return NextResponse.json(
        { error: 'Invalid entry ID', success: false },
        { status: 400 }
      )
    }
    
    await deleteTimeEntry(entryId)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting time entry:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete time entry', success: false },
      { status: 500 }
    )
  }
}
