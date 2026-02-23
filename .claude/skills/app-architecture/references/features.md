# Features – What the App Does and Where to Find It

## Table of Contents
1. [Time Entry Management](#time-entry-management)
2. [Views](#views)
3. [Project Management](#project-management)
4. [Billing & Rates](#billing--rates)
5. [PDF Export](#pdf-export)
6. [Settings](#settings)
7. [Data Migration](#data-migration)
8. [Analytics Calculations](#analytics-calculations)

---

## Time Entry Management

| Feature | Component | Notes |
|---|---|---|
| Add single entry | `components/day-view.tsx` | Inline form or dialog |
| Edit entry | `components/edit-entry-dialog.tsx` | Opens on row click |
| Delete entry | Inside `edit-entry-dialog.tsx` | Hard delete via `db.deleteTimeEntry()` |
| Bulk add | `components/bulk-entry-dialog.tsx` | Multiple entries at once |
| Bulk edit | `components/bulk-edit-dialog.tsx` | Batch update project/rate/description |

Entry shape (sent to API):
```ts
{
  date: string        // "YYYY-MM-DD"
  startHour: number   // 0–23 decimal
  endHour: number     // 0–23 decimal
  duration: number    // hours (decimal)
  projectId?: number
  billableRate?: number
  description?: string
}
```

## Views

### Day View (`components/day-view.tsx`)
- Timeline grid (hourly granularity) + list layout toggle
- Shows overlapping entries
- Reads: `db.getTimeEntries(date, date)` + company settings for core hours
- Highlights core hours band (coreStartTime → coreEndTime)

### Week View (`components/week-view.tsx`)
- 7-day grid, configurable start day (Mon/Sun/Sat)
- Daily hour totals, color-coded by project
- Reads: `db.getTimeEntries(weekStart, weekEnd)`

### Month View (`components/month-view.tsx`)
- Full calendar grid
- Activity heatmap per day (none/low/medium/high levels)
- Reads: `db.getTimeEntries(monthStart, monthEnd)`

### Date Navigation (`components/date-navigator.tsx`)
- Shared across all views; emits `onDateChange(date: Date)`

## Project Management

Component: `components/project-manager.tsx`

- Create project: name + color picker + optional billable rate
- Deactivate project: sets `isActive = false` (soft delete)
- Project filter for export: `components/project-filter.tsx`

Projects are color-coded across all views. Color is stored as a hex string (default `#164e63`).

## Billing & Rates

Rate resolution order (highest priority first):
1. Per-entry `billableRate` override
2. Project `defaultBillableRate`
3. User `defaultBillableRate`
4. `0` (unbilled)

Supported currencies: `USD`, `EUR`, `GBP`, `CAD`, `AUD`, `CHF`

Billable amount = `duration × effectiveBillableRate`

## PDF Export

Component: `components/export-dialog.tsx`
Generator: `lib/pdf-generator.ts`

Two report styles:
- **Professional** – Text-focused, structured table layout
- **Visual** – Charts and graphs via Recharts (rendered off-screen → captured to PDF)

Configuration options:
- Date range (custom start/end)
- Project filter (include/exclude specific projects)
- Include employee info (name, rate)
- Include company info (company name)
- Weekly and/or monthly breakdown sections

Key function:
```ts
// lib/pdf-generator.ts
generatePDFReport(config: PDFReportConfig): Promise<void>
```

## Settings

### Personal Settings (`components/personal-settings.tsx`)
- First/last name
- Default billable rate
- Preferred currency

### Company Settings (`components/company-settings.tsx`)
- Company name
- Core hours (start/end time)
- Working days (checkboxes)
- Timezone
- Week start day (Saturday / Sunday / Monday)

Both saved via: `db.saveUserSettings()` / `db.saveCompanySettings()`

## Data Migration

Component: `components/data-manager.tsx`
Prompt component: `components/migration-prompt.tsx`
API: `POST /api/migrate`

Migrates legacy IndexedDB (browser storage) data → PostgreSQL.
`lib/browser-storage.ts` is the read-only legacy adapter.

## Analytics Calculations

All calculations are done client-side from raw entry data:

| Metric | How Calculated |
|---|---|
| Daily total | Sum of `duration` for entries on a date |
| Weekly breakdown | Group entries by `date`, sum durations per day |
| Activity level | `none` <0.5h / `low` <2h / `medium` <6h / `high` ≥6h |
| Billable amount | `duration × effectiveRate` per entry, summed |
| Project distribution | Group entries by `projectId`, sum duration per project |

These are computed in the view components, not stored in the DB.
