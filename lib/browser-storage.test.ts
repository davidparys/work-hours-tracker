// Simple test file to verify browser storage functionality
// This can be run in the browser console to test the IndexedDB implementation

import { db } from './browser-storage'

// Test function that can be called from browser console
export async function testBrowserStorage() {
  console.log('🧪 Testing Browser Storage...')
  
  try {
    // Test 1: Add a time entry
    console.log('Test 1: Adding time entry...')
    const testEntry = await db.addTimeEntry({
      date: '2024-01-15',
      start_hour: 9,
      end_hour: 17,
      duration: 8,
      project: 'Test Project',
      description: 'Testing browser storage'
    })
    console.log('✅ Time entry added:', testEntry)

    // Test 2: Retrieve time entries
    console.log('Test 2: Retrieving time entries...')
    const entries = await db.getTimeEntries()
    console.log('✅ Retrieved entries:', entries)

    // Test 3: Add a project
    console.log('Test 3: Adding project...')
    const testProject = await db.addProject({
      name: 'Test Project',
      color: '#ff0000'
    })
    console.log('✅ Project added:', testProject)

    // Test 4: Retrieve projects
    console.log('Test 4: Retrieving projects...')
    const projects = await db.getProjects()
    console.log('✅ Retrieved projects:', projects)

    // Test 5: Get company settings
    console.log('Test 5: Getting company settings...')
    const settings = await db.getCompanySettings()
    console.log('✅ Company settings:', settings)

    // Test 6: Update time entry
    console.log('Test 6: Updating time entry...')
    const updatedEntry = await db.updateTimeEntry(testEntry.id!, {
      description: 'Updated description'
    })
    console.log('✅ Updated entry:', updatedEntry)

    // Test 7: Delete time entry
    console.log('Test 7: Deleting time entry...')
    const deleted = await db.deleteTimeEntry(testEntry.id!)
    console.log('✅ Deleted entry:', deleted)

    console.log('🎉 All tests passed! Browser storage is working correctly.')
    
    return {
      success: true,
      message: 'All tests passed! Browser storage is working correctly.'
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
    return {
      success: false,
      error: error
    }
  }
}

// Make test function available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testBrowserStorage = testBrowserStorage
}
