# Consumption Guide – How to Call Every Layer

## Table of Contents
1. [DatabaseClient (db singleton)](#databaseclient-db-singleton)
2. [REST API Endpoints](#rest-api-endpoints)
3. [Date & Time Utilities](#date--time-utilities)
4. [Utility: cn()](#utility-cn)
5. [Adding a New API Endpoint](#adding-a-new-api-endpoint)
6. [Adding a New Component with Data](#adding-a-new-component-with-data)

---

## DatabaseClient (db singleton)

Import from `lib/database.ts`. Use this in **all** React components — never call the DB directly from components.

```ts
import { db } from '@/lib/database'
```

### Time Entry Methods

```ts
// Fetch entries (optional date range)
const entries = await db.getTimeEntries()
const entries = await db.getTimeEntries('2025-12-01', '2025-12-31')

// Create
const entry = await db.addTimeEntry({
  date: '2025-12-15',
  startHour: 9,
  endHour: 11.5,
  duration: 2.5,
  projectId: 3,         // optional
  billableRate: 150,    // optional
  description: 'Sprint planning', // optional
})

// Update (partial)
await db.updateTimeEntry(entryId, { description: 'Updated', billableRate: 200 })

// Delete
await db.deleteTimeEntry(entryId)

// Batch update multiple entries
await db.batchUpdateTimeEntries([1, 2, 3], {
  projectId: 5,
  billableRate: 125,
})
```

### Project Methods

```ts
const projects = await db.getProjects()

const project = await db.addProject({
  name: 'New Project',
  color: '#0ea5e9',         // optional, hex
  defaultBillableRate: 100, // optional
})

await db.updateProject(projectId, { name: 'Renamed', color: '#f59e0b' })
await db.deleteProject(projectId) // soft delete (isActive = false)
```

### Settings Methods

```ts
const { user, company } = await db.getSettings()
// user: { firstName, lastName, defaultBillableRate, currency }
// company: { companyName, coreStartTime, coreEndTime, workingDays, timezone, weekStartsOn }

await db.saveUserSettings({ firstName: 'Alice', defaultBillableRate: 150, currency: 'EUR' })
await db.saveCompanySettings({ companyName: 'Acme', weekStartsOn: 'monday' })
```

### Aggregation Helpers

```ts
// Total hours for a single day
const hours = await db.getDailyHours('2025-12-15') // returns number

// Daily breakdown for a range (returns { date: string, hours: number }[])
const breakdown = await db.getWeeklyHours('2025-12-09', '2025-12-15')
```

---

## REST API Endpoints

Use these when writing server-side code, testing with curl, or understanding what the `db` client calls.

### Time Entries

```
GET  /api/time-entries?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
POST /api/time-entries           body: { date, startHour, endHour, duration, projectId?, billableRate?, description? }
PATCH /api/time-entries/[id]     body: partial entry fields
DELETE /api/time-entries/[id]
PATCH /api/time-entries/batch    body: { entryIds: number[], updates: { projectId?, billableRate?, description? } }
```

### Projects

```
GET  /api/projects
POST /api/projects               body: { name, color?, defaultBillableRate? }
PATCH /api/projects/[id]         body: partial project fields
DELETE /api/projects/[id]        (soft delete)
```

### Settings

```
GET /api/settings                returns { user, company }
PUT /api/settings                body: { user?: {...}, company?: {...} }
```

### All responses follow this envelope:
```json
{ "success": true, "data": { ... }, "error": null }
{ "success": false, "data": null, "error": "reason" }
```

---

## Date & Time Utilities

Import from `@/lib/utils/date-helpers`:

```ts
import {
  formatDate,
  parseDate,
  getWeekDates,
  getMonthDates,
  formatHours,
  formatCurrency,
  formatDateRange,
  getActivityLevel,
  getWeekDayHeaders,
  getISOWeekNumber,
  getMonthName,
} from '@/lib/utils/date-helpers'
```

### Reference

```ts
formatDate(new Date())
// → "2025-12-15"

parseDate('2025-12-15')
// → Date object at midnight local time

getWeekDates(new Date(), 'monday')
// → { start: Date, end: Date }
// weekStartsOn: 'monday' | 'sunday' | 'saturday'

getMonthDates(new Date())
// → { start: Date, end: Date, dates: Date[] }

formatHours(2.5)
// → "2h 30m"
formatHours(0.75)
// → "45m"

formatCurrency(1250, 'USD')
// → "$1,250.00"

formatDateRange(startDate, endDate)
// → "Dec 1 – Dec 7"

getActivityLevel(hours: number)
// → 'none' | 'low' | 'medium' | 'high'
// none: <0.5, low: <2, medium: <6, high: ≥6

getWeekDayHeaders('monday')
// → ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

getISOWeekNumber(new Date())
// → 50  (ISO week number)

getMonthName(new Date())
// → "December 2025"
```

---

## Utility: cn()

Import from `@/lib/utils`:

```ts
import { cn } from '@/lib/utils'

// Merge Tailwind classes safely (clsx + tailwind-merge)
cn('px-4 py-2', isActive && 'bg-blue-500', className)
```

---

## Adding a New API Endpoint

1. Create `app/api/<resource>/route.ts` (and optionally `app/api/<resource>/[id]/route.ts`)
2. Import queries from `lib/db/queries.ts`
3. Return the standard envelope:

```ts
// app/api/reports/route.ts
import { NextResponse } from 'next/server'
import { getTimeEntries } from '@/lib/db/queries'

export async function GET(request: Request) {
  try {
    const data = await getTimeEntries()
    return NextResponse.json({ success: true, data, error: null })
  } catch (err) {
    return NextResponse.json(
      { success: false, data: null, error: String(err) },
      { status: 500 }
    )
  }
}
```

4. Add the corresponding method to the `DatabaseClient` class in `lib/database.ts`:

```ts
async getReports() {
  const res = await fetch('/api/reports')
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data
}
```

---

## Adding a New Component with Data

Pattern used by all existing views:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/database'

interface Props {
  refreshKey: number       // increment from page.tsx triggers re-fetch
  onDataChange: () => void // call after any mutation
}

export function MyFeature({ refreshKey, onDataChange }: Props) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.getTimeEntries().then(setEntries).finally(() => setLoading(false))
  }, [refreshKey])  // re-runs when parent increments refreshKey

  const handleAdd = async (entry) => {
    await db.addTimeEntry(entry)
    onDataChange()  // tell parent → siblings re-fetch
  }

  return <div>...</div>
}
```

Wire it up in `app/page.tsx` by passing `refreshKey` and `onDataChange` as props.
