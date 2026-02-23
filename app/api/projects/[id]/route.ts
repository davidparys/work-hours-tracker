import { NextRequest, NextResponse } from 'next/server'
import { updateProject, deleteProject, getProjectById } from '@/lib/db/queries'

// PATCH /api/projects/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const projectId = parseInt(id, 10)
    
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID', success: false },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { name, color, defaultBillableRate } = body

    // Check if project exists
    const existingProject = await getProjectById(projectId)
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found', success: false },
        { status: 404 }
      )
    }

    const updates: { name?: string; color?: string; defaultBillableRate?: number | null } = {}
    if (name !== undefined) updates.name = name
    if (color !== undefined) updates.color = color
    if (defaultBillableRate !== undefined) updates.defaultBillableRate = defaultBillableRate === null ? null : Number(defaultBillableRate)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', success: false },
        { status: 400 }
      )
    }

    const project = await updateProject(projectId, updates)
    
    return NextResponse.json({ data: project, success: true })
  } catch (error: any) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update project', success: false },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const projectId = parseInt(id, 10)
    
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID', success: false },
        { status: 400 }
      )
    }
    
    // Check if project exists
    const existingProject = await getProjectById(projectId)
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found', success: false },
        { status: 404 }
      )
    }
    
    await deleteProject(projectId)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete project', success: false },
      { status: 500 }
    )
  }
}









