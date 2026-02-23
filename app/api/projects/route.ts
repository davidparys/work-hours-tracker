import { NextRequest, NextResponse } from 'next/server'
import { getAllProjects, createProject } from '@/lib/db/queries'

// GET /api/projects
export async function GET() {
  try {
    const projects = await getAllProjects()
    return NextResponse.json({ data: projects, success: true })
  } catch (error: any) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch projects', success: false },
      { status: 500 }
    )
  }
}

// POST /api/projects
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color, defaultBillableRate } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name', success: false },
        { status: 400 }
      )
    }

    const project = await createProject(name, color || '#164e63', defaultBillableRate ?? undefined)
    
    return NextResponse.json({ data: project, success: true }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create project', success: false },
      { status: 500 }
    )
  }
}
