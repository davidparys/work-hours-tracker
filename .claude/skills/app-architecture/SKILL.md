---
name: app-architecture
description: >
  Comprehensive guide to the work-hours-tracker (TimeTracker) codebase.
  Use when an agent needs to understand the project structure, add features,
  fix bugs, navigate the codebase, or consume any of the app's layers.
  Covers architecture overview, technology stack, data flow, and consumption
  patterns for the API, database, utilities, and UI components.
---

# TimeTracker – App Architecture

## Stack at a Glance

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| UI | React 18, shadcn/ui, Tailwind CSS 4 |
| Database | PostgreSQL + Drizzle ORM |
| PDF | jsPDF 3 |
| Forms | React Hook Form + Zod |
| Package manager | pnpm |

## Directory Map

```
app/                  # Next.js App Router (pages + API routes)
  api/
    time-entries/     # CRUD + batch for time entries
    projects/         # Project CRUD
    settings/         # User + company settings
    migrate/          # IndexedDB → Postgres migration
components/           # React client components
  ui/                 # shadcn/ui primitives (30+ components)
lib/
  db/
    schema.ts         # Drizzle table definitions
    queries.ts        # All SQL queries
    client.ts         # Connection pool (DATABASE_URL)
  database.ts         # DatabaseClient singleton (API wrapper)
  pdf-generator.ts    # jsPDF report builder
  browser-storage.ts  # Legacy IndexedDB (migration only)
  utils/
    date-helpers.ts   # 15+ date/time utilities
  utils.ts            # cn() class merger
drizzle/              # SQL migration files
```

## Reference Files

Load only the section you need:

- **[architecture.md](references/architecture.md)** – Data flow, state management, rendering model, refresh pattern
- **[features.md](references/features.md)** – All user-facing features with component locations
- **[consumption.md](references/consumption.md)** – How to call the API, database, utilities, and add new endpoints

## Quick Orientation Rules

1. All data mutations go through `/app/api/` routes, never direct DB calls from components.
2. The singleton `db` (from `lib/database.ts`) is the client for every component.
3. Default `userId` is always `1` — single-user app by design.
4. Projects use soft-delete (`isActive = false`); time entries use hard delete.
5. Dates are stored as `YYYY-MM-DD` strings; hours as `real` numbers (0–23 range).
