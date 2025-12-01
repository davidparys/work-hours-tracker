'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database, ArrowRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

const DB_NAME = 'WorkHoursTracker'
const MIGRATION_KEY = 'migration_completed'

export function MigrationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [stats, setStats] = useState<{ timeEntries: number; projects: number } | null>(null)

  useEffect(() => {
    checkForMigration()
  }, [])

  async function checkForMigration() {
    // Check if migration was already completed
    if (localStorage.getItem(MIGRATION_KEY) === 'true') {
      return
    }

    // Check if IndexedDB has data
    try {
      const hasData = await checkIndexedDBData()
      if (hasData) {
        setShowPrompt(true)
      }
    } catch (error) {
      console.error('Error checking for migration data:', error)
    }
  }

  async function checkIndexedDBData(): Promise<boolean> {
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME)
      
      request.onsuccess = () => {
        const db = request.result
        
        if (!db.objectStoreNames.contains('time_entries')) {
          resolve(false)
          return
        }

        const transaction = db.transaction(['time_entries'], 'readonly')
        const store = transaction.objectStore('time_entries')
        const countRequest = store.count()

        countRequest.onsuccess = () => {
          resolve(countRequest.result > 0)
        }

        countRequest.onerror = () => {
          resolve(false)
        }
      }

      request.onerror = () => {
        resolve(false)
      }
    })
  }

  async function exportIndexedDBData() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME)

      request.onsuccess = () => {
        const db = request.result
        const data: any = {
          timeEntries: [],
          projects: [],
          userSettings: {},
          companySettings: {},
        }

        const transaction = db.transaction(
          ['time_entries', 'projects', 'user_settings', 'company_settings'],
          'readonly'
        )

        // Export time entries
        const timeEntriesStore = transaction.objectStore('time_entries')
        const timeEntriesRequest = timeEntriesStore.getAll()
        timeEntriesRequest.onsuccess = () => {
          data.timeEntries = timeEntriesRequest.result
        }

        // Export projects
        const projectsStore = transaction.objectStore('projects')
        const projectsRequest = projectsStore.getAll()
        projectsRequest.onsuccess = () => {
          data.projects = projectsRequest.result
        }

        // Export user settings
        const userSettingsStore = transaction.objectStore('user_settings')
        const userSettingsRequest = userSettingsStore.getAll()
        userSettingsRequest.onsuccess = () => {
          data.userSettings = userSettingsRequest.result[0] || {}
        }

        // Export company settings
        const companySettingsStore = transaction.objectStore('company_settings')
        const companySettingsRequest = companySettingsStore.getAll()
        companySettingsRequest.onsuccess = () => {
          data.companySettings = companySettingsRequest.result[0] || {}
        }

        transaction.oncomplete = () => {
          resolve(data)
        }

        transaction.onerror = () => {
          reject(transaction.error)
        }
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async function handleMigrate() {
    setMigrating(true)
    setProgress(0)
    setStatus('idle')
    setErrorMessage('')

    try {
      // Step 1: Export data from IndexedDB
      setProgress(10)
      const data = await exportIndexedDBData()
      setProgress(40)

      // Step 2: Send data to migration API
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      setProgress(70)

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Migration failed')
      }

      // Step 3: Mark migration as complete
      setProgress(100)
      setStats(result.stats)
      setStatus('success')
      localStorage.setItem(MIGRATION_KEY, 'true')

      // Close dialog after 3 seconds
      setTimeout(() => {
        setShowPrompt(false)
        window.location.reload()
      }, 3000)
    } catch (error: any) {
      console.error('Migration error:', error)
      setStatus('error')
      setErrorMessage(error.message || 'An unexpected error occurred')
      setMigrating(false)
    }
  }

  function handleRemindLater() {
    setShowPrompt(false)
  }

  if (!showPrompt) {
    return null
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <DialogTitle>Database Migration Required</DialogTitle>
          </div>
          <DialogDescription className="pt-4 space-y-2">
            <p>
              We've detected existing data in your browser storage. To improve performance and reliability,
              we need to migrate your data to a PostgreSQL database.
            </p>
            <p className="text-sm">
              <strong>What will happen:</strong>
            </p>
            <ul className="text-sm list-disc list-inside space-y-1 ml-2">
              <li>Your time entries, projects, and settings will be transferred</li>
              <li>Data will persist across browsers and survive cache clears</li>
              <li>The migration is one-time and automatic</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        {migrating && (
          <div className="space-y-4 py-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              {progress < 40
                ? 'Exporting data from browser storage...'
                : progress < 70
                ? 'Transferring data to database...'
                : 'Finalizing migration...'}
            </p>
          </div>
        )}

        {status === 'success' && stats && (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-600">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Migration completed successfully! Migrated {stats.timeEntries} time entries and{' '}
              {stats.projects} projects. Reloading app...
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {!migrating && status === 'idle' && (
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={handleRemindLater}>
              Remind Me Later
            </Button>
            <Button onClick={handleMigrate} className="gap-2">
              Migrate Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        )}

        {migrating && (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
