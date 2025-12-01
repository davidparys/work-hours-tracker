import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUser, updateUser, getCompanySettings, updateCompanySettings } from '@/lib/db/queries'

// GET /api/settings
export async function GET() {
  try {
    const [user, company] = await Promise.all([
      getOrCreateUser(),
      getCompanySettings(),
    ])
    
    return NextResponse.json({
      data: {
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          defaultBillableRate: user.defaultBillableRate,
          currency: user.currency || 'USD',
        },
        company: {
          coreStartTime: company.coreStartTime,
          coreEndTime: company.coreEndTime,
          workingDays: company.workingDays.split(','),
          companyName: company.companyName,
          timezone: company.timezone,
          weekStartsOn: company.weekStartsOn,
        },
      },
      success: true,
    })
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings', success: false },
      { status: 500 }
    )
  }
}

// PUT /api/settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { user: userUpdates, company: companyUpdates } = body
    
    const promises = []
    
    if (userUpdates) {
      promises.push(updateUser(userUpdates))
    }
    
    if (companyUpdates) {
      // Convert workingDays array to comma-separated string
      if (companyUpdates.workingDays && Array.isArray(companyUpdates.workingDays)) {
        companyUpdates.workingDays = companyUpdates.workingDays.join(',')
      }
      promises.push(updateCompanySettings(companyUpdates))
    }
    
    await Promise.all(promises)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update settings', success: false },
      { status: 500 }
    )
  }
}
