import { NextRequest, NextResponse } from 'next/server'
import { getTimeEntries, getAllProjects, getOrCreateUser, getCompanySettings } from '@/lib/db/queries'
import { PDFGenerator } from '@/lib/pdf-generator'

// GET /api/export/pdf?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&projectId=N&style=professional|visual
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const projectId = searchParams.get('projectId')
    const style = (searchParams.get('style') ?? 'professional') as 'professional' | 'visual'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required', success: false },
        { status: 400 }
      )
    }

    const [allEntries, allProjects, user, company] = await Promise.all([
      getTimeEntries(startDate, endDate),
      getAllProjects(),
      getOrCreateUser(),
      getCompanySettings(),
    ])

    // Filter by project if specified
    const entries = projectId
      ? allEntries.filter((e) => e.projectId === Number(projectId))
      : allEntries

    const generator = new PDFGenerator()
    const pdfBlob = await generator.generatePDF({
      startDate,
      endDate,
      entries,
      projects: allProjects,
      style,
      showProjects: true,
      weekStartsOn: (company.weekStartsOn as 'monday' | 'sunday' | 'saturday') ?? 'monday',
      currency: user.currency ?? 'USD',
      userSettings: {
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
      },
      companySettings: {
        companyName: company.companyName ?? '',
        timezone: company.timezone ?? 'UTC',
      },
    })

    const arrayBuffer = await pdfBlob.arrayBuffer()

    // Build a descriptive filename
    let filename = `time-report-${startDate}-to-${endDate}`
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    if (fullName) {
      filename = `${fullName.replace(/\s+/g, '-')}-${filename}`
    }
    if (projectId) {
      const project = allProjects.find((p) => p.id === Number(projectId))
      if (project) {
        filename += `-${project.name.replace(/\s+/g, '-')}`
      }
    }
    filename += `-${style}.pdf`

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Filename': filename,
      },
    })
  } catch (error: any) {
    console.error('Error generating PDF export:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF', success: false },
      { status: 500 }
    )
  }
}
