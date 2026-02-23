# Architecture – Data Flow, State, Rendering

## Table of Contents
1. [Data Flow](#data-flow)
2. [State Management](#state-management)
3. [Rendering Model](#rendering-model)
4. [Database Schema](#database-schema)
5. [API Response Contract](#api-response-contract)

---

## Data Flow

```
User Action
  ↓
"use client" Component (useState / event handler)
  ↓
db.method()  ← lib/database.ts DatabaseClient
  ↓
fetch() → /api/...  (Next.js Route Handler, Node.js runtime)
  ↓
lib/db/queries.ts  (Drizzle ORM)
  ↓
PostgreSQL
  ↓
JSON response → setState() → re-render
```

## State Management

No Redux or Context. Pure React:

| Pattern | Where |
|---|---|
| `useState` + `useEffect` | DayView, WeekView, MonthView, all dialogs |
| `refreshKey` increment | `app/page.tsx` — `onDataChange()` callback props passed to all views |
| Singleton `db` client | `lib/database.ts` — imported directly in components |
| Theme | `next-themes` ThemeProvider in `app/layout.tsx` |

**Refresh pattern** (important for feature work):
```tsx
// page.tsx
const [refreshKey, setRefreshKey] = useState(0)
const handleDataChange = () => setRefreshKey(k => k + 1)

// passed to children
<DayView refreshKey={refreshKey} onDataChange={handleDataChange} />
```
When any component mutates data, it calls `onDataChange()` which increments `refreshKey`, causing sibling views to re-fetch.

## Rendering Model

- **Client Components** (`"use client"`) — all interactive UI (views, dialogs, forms)
- **Server Route Handlers** — `/app/api/**` — never imported by components; only reached via `fetch()`
- **No React Server Components** used for data fetching — all data comes through the API

## Database Schema

```sql
users
  id            SERIAL PK
  firstName     TEXT
  lastName      TEXT
  defaultBillableRate  REAL (nullable)
  currency      TEXT DEFAULT 'USD'
  createdAt, updatedAt  TIMESTAMP

projects
  id            SERIAL PK
  name          TEXT UNIQUE
  color         TEXT DEFAULT '#164e63'
  defaultBillableRate  REAL (nullable)
  isActive      BOOLEAN DEFAULT true   -- soft delete flag
  createdAt     TIMESTAMP

time_entries
  id            SERIAL PK
  userId        INT FK → users (default 1)
  projectId     INT FK → projects (nullable)
  date          TEXT  (YYYY-MM-DD)
  startHour     REAL  (0–23, e.g. 9.5 = 9:30 AM)
  endHour       REAL  (0–23)
  duration      REAL  (hours, e.g. 2.5)
  billableRate  REAL (nullable, per-entry override)
  description   TEXT (nullable)
  createdAt, updatedAt  TIMESTAMP

company_settings
  id            SERIAL PK
  coreStartTime TEXT DEFAULT '09:00'
  coreEndTime   TEXT DEFAULT '17:00'
  workingDays   TEXT (comma-separated, e.g. 'Mon,Tue,Wed,Thu,Fri')
  companyName   TEXT DEFAULT 'My Company'
  timezone      TEXT DEFAULT 'UTC'
  weekStartsOn  TEXT DEFAULT 'monday'  -- 'saturday'|'sunday'|'monday'
  updatedAt     TIMESTAMP
```

Key conventions:
- `startHour`/`endHour` are decimals: `9.5` = 9:30 AM, `17.0` = 5:00 PM
- `date` is always a plain `YYYY-MM-DD` string, never a JS Date stored directly
- `userId = 1` is the only user; `getOrCreateUser()` in queries.ts ensures it exists

## API Response Contract

Every `/api/**` route returns the same envelope:

```json
{
  "success": true | false,
  "data": { ... } | null,
  "error": "message" | null
}
```

HTTP status mirrors success: `200` on success, `4xx`/`5xx` on failure.
