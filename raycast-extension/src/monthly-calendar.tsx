import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  useNavigation,
  Form,
  popToRoot,
} from "@raycast/api"
import { useState, useEffect, useMemo } from "react"

const API_BASE = "http://localhost:1337"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: number
  name: string
  color: string
  isActive?: boolean
  defaultBillableRate?: number | null
}

interface TimeEntry {
  id: number
  date: string // YYYY-MM-DD
  startHour: number
  endHour: number
  duration: number
  projectId: number | null
  project?: string | null
  billableRate?: number | null
  description?: string | null
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface DayData {
  dateString: string
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  hours: number
  entries: TimeEntry[]
  projects: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function formatHours(hours: number): string {
  if (hours === 0) return "0h"
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function getMonthBounds(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return { start: formatDateString(start), end: formatDateString(end) }
}

function getActivityLevel(hours: number): 0 | 1 | 2 | 3 | 4 {
  if (hours === 0) return 0
  if (hours < 2) return 1
  if (hours < 4) return 2
  if (hours < 7) return 3
  return 4
}

// GitHub-style activity blocks rendered as emoji squares
const ACTIVITY_BLOCKS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "⬜",
  1: "🟩",
  2: "🟦",
  3: "🟪",
  4: "🟥",
}

// Text-art activity bars for the day detail subtitle
function activityBar(hours: number, max: number): string {
  if (max === 0) return "░░░░░░░░"
  const ratio = Math.min(hours / max, 1)
  const filled = Math.round(ratio * 8)
  return "█".repeat(filled) + "░".repeat(8 - filled)
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

// ─── Calendar grid builder ────────────────────────────────────────────────────

function buildCalendarWeeks(
  year: number,
  month: number,
  monthlyData: Record<string, { hours: number; entries: TimeEntry[] }>,
  weekStartsOn: "saturday" | "sunday" | "monday" = "monday",
): DayData[][] {
  const weekStartMap = { saturday: 6, sunday: 0, monday: 1 }
  const weekStart = weekStartMap[weekStartsOn]

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const today = formatDateString(new Date())

  // Find the start of the first rendered week
  const startDate = new Date(firstDay)
  let diff = firstDay.getDay() - weekStart
  if (diff < 0) diff += 7
  startDate.setDate(startDate.getDate() - diff)

  const weeks: DayData[][] = []
  const cursor = new Date(startDate)

  while (cursor <= lastDay || cursor.getDay() !== weekStart) {
    const week: DayData[] = []
    for (let i = 0; i < 7; i++) {
      const ds = formatDateString(cursor)
      const dayNum = cursor.getDay()
      const slot = monthlyData[ds]

      week.push({
        dateString: ds,
        dayOfMonth: cursor.getDate(),
        isCurrentMonth: cursor.getMonth() === month,
        isToday: ds === today,
        isWeekend: dayNum === 0 || dayNum === 6,
        hours: slot?.hours ?? 0,
        entries: slot?.entries ?? [],
        projects: [...new Set((slot?.entries ?? []).map((e) => e.project ?? "No project"))],
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
    if (cursor > lastDay && cursor.getDay() === weekStart) break
  }

  return weeks
}

// ─── Add Entry Form ───────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`
}

interface AddEntryFormProps {
  /** Pre-filled date string YYYY-MM-DD */
  initialDate: string
  projects: Project[]
  defaultBillableRate?: number
  onSuccess: () => void
}

function AddEntryForm({ initialDate, projects, defaultBillableRate, onSuccess }: AddEntryFormProps) {
  const { pop } = useNavigation()

  const [projectId, setProjectId] = useState("")
  const [date, setDate] = useState<Date>(new Date(initialDate + "T00:00:00"))
  const [startHour, setStartHour] = useState("9")
  const [endHour, setEndHour] = useState("10")
  const [billableRate, setBillableRate] = useState(defaultBillableRate != null ? String(defaultBillableRate) : "")
  const [description, setDescription] = useState("")
  const [endHourError, setEndHourError] = useState<string | undefined>()
  const [billableRateError, setBillableRateError] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

  function handleProjectChange(id: string) {
    setProjectId(id)
    if (id) {
      const project = projects.find((p) => p.id === Number(id))
      if (project?.defaultBillableRate != null) {
        setBillableRate(String(project.defaultBillableRate))
        return
      }
    }
    setBillableRate(defaultBillableRate != null ? String(defaultBillableRate) : "")
  }

  function validateEndHour(end: string, start: string): string | undefined {
    return Number(end) <= Number(start) ? "End time must be after start time" : undefined
  }

  function validateBillableRate(value: string): string | undefined {
    if (value === "") return undefined
    const n = Number(value)
    return isNaN(n) || n < 0 ? "Must be a positive number" : undefined
  }

  async function handleSubmit() {
    const endErr = validateEndHour(endHour, startHour)
    const rateErr = validateBillableRate(billableRate)
    if (endErr) setEndHourError(endErr)
    if (rateErr) setBillableRateError(rateErr)
    if (endErr || rateErr) return

    setEndHourError(undefined)
    setBillableRateError(undefined)
    setSubmitting(true)

    const start = Number(startHour)
    const end = Number(endHour)
    const d = date ?? new Date(initialDate + "T00:00:00")
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

    const payload = {
      date: dateStr,
      startHour: start,
      endHour: end,
      duration: end - start,
      projectId: projectId ? Number(projectId) : null,
      billableRate: billableRate !== "" ? Number(billableRate) : undefined,
      description: description || undefined,
    }

    try {
      const res = await fetch(`${API_BASE}/api/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = (await res.json()) as ApiResponse<unknown>
      if (!res.ok || !result.success) throw new Error(result.error ?? "Failed to add entry")

      await showToast({
        style: Toast.Style.Success,
        title: "Entry added",
        message: `${end - start}h logged on ${dateStr}`,
      })
      onSuccess()
      pop()
    } catch (err: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add entry",
        message: err?.message ?? "Unknown error",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form
      navigationTitle={`Add Entry — ${new Date(initialDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`}
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Entry" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="projectId" title="Project" value={projectId} onChange={handleProjectChange}>
        <Form.Dropdown.Item value="" title="No Project" />
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} value={String(p.id)} title={p.name} />
        ))}
      </Form.Dropdown>

      <Form.DatePicker
        id="date"
        title="Date"
        type={Form.DatePicker.Type.Date}
        value={date}
        onChange={(d) => setDate(d ?? new Date(initialDate + "T00:00:00"))}
      />

      <Form.Dropdown
        id="startHour"
        title="Start Time"
        value={startHour}
        onChange={(v) => { setStartHour(v); setEndHourError(validateEndHour(endHour, v)) }}
      >
        {HOURS.map((h) => <Form.Dropdown.Item key={h} value={String(h)} title={formatHourLabel(h)} />)}
      </Form.Dropdown>

      <Form.Dropdown
        id="endHour"
        title="End Time"
        value={endHour}
        error={endHourError}
        onChange={(v) => { setEndHour(v); setEndHourError(validateEndHour(v, startHour)) }}
      >
        {HOURS.map((h) => <Form.Dropdown.Item key={h} value={String(h)} title={formatHourLabel(h)} />)}
      </Form.Dropdown>

      <Form.TextField
        id="billableRate"
        title="Billable Rate (per hr)"
        placeholder="e.g. 95"
        value={billableRate}
        error={billableRateError}
        onChange={(v) => { setBillableRate(v); setBillableRateError(validateBillableRate(v)) }}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="What did you work on? (optional)"
        value={description}
        onChange={setDescription}
      />
    </Form>
  )
}

// ─── Detail view for a single day ────────────────────────────────────────────

function DayDetail({ day, projects, defaultBillableRate, onEntryAdded }: {
  day: DayData
  projects: Project[]
  defaultBillableRate?: number
  onEntryAdded: () => void
}) {
  const { push } = useNavigation()

  const projectMap = useMemo(() => {
    const m: Record<number, Project> = {}
    projects.forEach((p) => (m[p.id] = p))
    return m
  }, [projects])

  const dateLabel = new Date(day.dateString + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  function openAddForm() {
    push(
      <AddEntryForm
        initialDate={day.dateString}
        projects={projects}
        defaultBillableRate={defaultBillableRate}
        onSuccess={onEntryAdded}
      />,
    )
  }

  return (
    <List navigationTitle={dateLabel} isShowingDetail>
      {day.entries.length === 0 ? (
        <List.EmptyView
          title="No entries"
          description={`Nothing logged on ${dateLabel}`}
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action title="Add Time Entry" icon={Icon.Plus} shortcut={{ modifiers: ["cmd"], key: "n" }} onAction={openAddForm} />
            </ActionPanel>
          }
        />
      ) : (
        day.entries.map((entry) => {
          const proj = entry.projectId ? projectMap[entry.projectId] : undefined
          const startLabel = `${String(Math.floor(entry.startHour)).padStart(2, "0")}:${entry.startHour % 1 === 0.5 ? "30" : "00"}`
          const endLabel = `${String(Math.floor(entry.endHour)).padStart(2, "0")}:${entry.endHour % 1 === 0.5 ? "30" : "00"}`

          return (
            <List.Item
              key={entry.id}
              title={entry.description ?? (proj?.name ?? "No project")}
              subtitle={`${startLabel} – ${endLabel}`}
              accessories={[
                { text: formatHours(entry.duration) },
                entry.billableRate != null ? { text: `$${entry.billableRate}/hr` } : { text: "" },
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Duration" text={formatHours(entry.duration)} />
                      <List.Item.Detail.Metadata.Label title="Time" text={`${startLabel} – ${endLabel}`} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Project"
                        text={proj?.name ?? "No project"}
                        icon={proj ? { source: Icon.CircleFilled, tintColor: proj.color } : undefined}
                      />
                      {entry.billableRate != null && (
                        <List.Item.Detail.Metadata.Label title="Rate" text={`$${entry.billableRate}/hr`} />
                      )}
                      {entry.description && (
                        <List.Item.Detail.Metadata.Label title="Notes" text={entry.description} />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action title="Add Time Entry" icon={Icon.Plus} shortcut={{ modifiers: ["cmd"], key: "n" }} onAction={openAddForm} />
                  <Action.OpenInBrowser title="Open TimeTracker" url="http://localhost:1337" icon={Icon.Globe} />
                </ActionPanel>
              }
            />
          )
        })
      )}
    </List>
  )
}

// ─── Main command ─────────────────────────────────────────────────────────────

type FilterType = "all" | "with-entries" | "billable" | "weekdays-only"
type SortType = "date-asc" | "date-desc" | "hours-desc"

export default function MonthlyCalendar() {
  const { push } = useNavigation()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed

  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [weekStartsOn, setWeekStartsOn] = useState<"saturday" | "sunday" | "monday">("monday")
  const [defaultBillableRate, setDefaultBillableRate] = useState<number | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filters (surfaced via ⌘K)
  const [filter, setFilter] = useState<FilterType>("all")
  const [sort, setSort] = useState<SortType>("date-asc")
  const [selectedProjectId, setSelectedProjectId] = useState<number | "all">("all")

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    loadAll()
  }, [year, month])

  async function loadAll() {
    setIsLoading(true)
    try {
      const { start, end } = getMonthBounds(year, month)
      const [projRes, settingsRes, entriesRes] = await Promise.all([
        fetch(`${API_BASE}/api/projects`),
        fetch(`${API_BASE}/api/settings`),
        fetch(`${API_BASE}/api/time-entries?startDate=${start}&endDate=${end}`),
      ])

      if (!projRes.ok || !settingsRes.ok || !entriesRes.ok) {
        throw new Error("Failed to load data from TimeTracker")
      }

      const projData = (await projRes.json()) as ApiResponse<Project[]>
      const settingsData = (await settingsRes.json()) as ApiResponse<{
        user: { defaultBillableRate?: number | null }
        company: { weekStartsOn?: string }
      }>
      const entriesData = (await entriesRes.json()) as ApiResponse<TimeEntry[]>

      if (projData.success && projData.data) setProjects(projData.data.filter((p) => p.isActive !== false))
      if (entriesData.success && entriesData.data) setEntries(entriesData.data)
      if (settingsData.success && settingsData.data?.company?.weekStartsOn) {
        setWeekStartsOn(settingsData.data.company.weekStartsOn as "saturday" | "sunday" | "monday")
      }
      if (settingsData.success && settingsData.data?.user?.defaultBillableRate != null) {
        setDefaultBillableRate(settingsData.data.user.defaultBillableRate)
      }
      setLoadError(null)
    } catch {
      setLoadError("Cannot connect to TimeTracker. Make sure the app is running on localhost:1337.")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const filteredEntries = useMemo(() => {
    let es = entries
    if (selectedProjectId !== "all") {
      es = es.filter((e) =>
        selectedProjectId === 0 ? e.projectId === null : e.projectId === selectedProjectId,
      )
    }
    if (filter === "with-entries") es = es // calendar will handle showing only days with entries
    if (filter === "billable") es = es.filter((e) => (e.billableRate ?? 0) > 0)
    return es
  }, [entries, selectedProjectId, filter])

  const monthlyData = useMemo(() => {
    const map: Record<string, { hours: number; entries: TimeEntry[] }> = {}
    filteredEntries.forEach((e) => {
      if (!map[e.date]) map[e.date] = { hours: 0, entries: [] }
      map[e.date].hours += e.duration
      map[e.date].entries.push(e)
    })
    return map
  }, [filteredEntries])

  const calendarWeeks = useMemo(
    () => buildCalendarWeeks(year, month, monthlyData, weekStartsOn),
    [year, month, monthlyData, weekStartsOn],
  )

  // Flat list of current-month days (for the list view)
  const allDays = useMemo(() => {
    const days = calendarWeeks.flat().filter((d) => d.isCurrentMonth)

    // Apply filter
    let result = days
    if (filter === "with-entries") result = days.filter((d) => d.hours > 0)
    if (filter === "weekdays-only") result = days.filter((d) => !d.isWeekend)

    // Apply sort
    if (sort === "date-desc") result = [...result].reverse()
    if (sort === "hours-desc") result = [...result].sort((a, b) => b.hours - a.hours)

    return result
  }, [calendarWeeks, filter, sort])

  const maxHours = useMemo(() => Math.max(...allDays.map((d) => d.hours), 1), [allDays])
  const totalHours = useMemo(() => allDays.reduce((s, d) => s + d.hours, 0), [allDays])
  const workingDays = useMemo(() => allDays.filter((d) => d.hours > 0).length, [allDays])

  // ── Navigation helpers ────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  // ── Open add-entry form with a pre-filled date ────────────────────────────

  function openAddForm(dateString: string) {
    push(
      <AddEntryForm
        initialDate={dateString}
        projects={projects}
        defaultBillableRate={defaultBillableRate}
        onSuccess={loadAll}
      />,
    )
  }

  // ── Calendar header rows ──────────────────────────────────────────────────

  function renderCalendarHeader(): string {
    const weekStartMap = { saturday: 6, sunday: 0, monday: 1 }
    const startIdx = weekStartMap[weekStartsOn]
    const days: string[] = []
    for (let i = 0; i < 7; i++) {
      days.push(WEEKDAY_SHORT[(startIdx + i) % 7].slice(0, 2))
    }
    return days.join("  ")
  }

  // One row per week – compact block representation
  function renderWeekRow(week: DayData[]): string {
    return week
      .map((d) => {
        if (!d.isCurrentMonth) return "  "
        const block = ACTIVITY_BLOCKS[getActivityLevel(d.hours)]
        return block
      })
      .join(" ")
  }

  // ── Section: GitHub-style calendar strip ──────────────────────────────────

  const calendarSectionTitle = `${MONTH_NAMES[month]} ${year}  ·  ${formatHours(totalHours)} logged  ·  ${workingDays} day${workingDays !== 1 ? "s" : ""}`

  // ── Error state ───────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <List>
        <List.EmptyView
          title="Cannot Connect"
          description={loadError}
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadAll} />
            </ActionPanel>
          }
        />
      </List>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Monthly Calendar – ${MONTH_NAMES[month]} ${year}`}
      searchBarPlaceholder="Filter by day or project…"
    >
      {/* Calendar visual header */}
      <List.Section title={calendarSectionTitle} subtitle={`⬜ none  🟩 <2h  🟦 <4h  🟪 <7h  🟥 7h+`}>
        {/* Weekday header row */}
        <List.Item
          title={renderCalendarHeader()}
          subtitle=""
          accessories={[{ text: "Week", icon: Icon.Calendar }]}
          actions={
            <ActionPanel>
              <Action title="Previous Month" icon={Icon.ChevronLeft} shortcut={{ modifiers: ["cmd"], key: "[" }} onAction={prevMonth} />
              <Action title="Next Month" icon={Icon.ChevronRight} shortcut={{ modifiers: ["cmd"], key: "]" }} onAction={nextMonth} />
              <ActionPanel.Section title="Filter">
                <Action
                  title="Show All Days"
                  icon={filter === "all" ? Icon.CheckCircle : Icon.Circle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  onAction={() => setFilter("all")}
                />
                <Action
                  title="Days With Entries Only"
                  icon={filter === "with-entries" ? Icon.CheckCircle : Icon.Circle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  onAction={() => setFilter("with-entries")}
                />
                <Action
                  title="Billable Entries Only"
                  icon={filter === "billable" ? Icon.CheckCircle : Icon.Circle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                  onAction={() => setFilter("billable")}
                />
                <Action
                  title="Weekdays Only"
                  icon={filter === "weekdays-only" ? Icon.CheckCircle : Icon.Circle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                  onAction={() => setFilter("weekdays-only")}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Sort">
                <Action
                  title="Sort: Date ↑"
                  icon={sort === "date-asc" ? Icon.CheckCircle : Icon.Circle}
                  shortcut={{ modifiers: ["ctrl"], key: "1" }}
                  onAction={() => setSort("date-asc")}
                />
                <Action
                  title="Sort: Date ↓"
                  icon={sort === "date-desc" ? Icon.CheckCircle : Icon.Circle}
                  shortcut={{ modifiers: ["ctrl"], key: "2" }}
                  onAction={() => setSort("date-desc")}
                />
                <Action
                  title="Sort: Most Hours First"
                  icon={sort === "hours-desc" ? Icon.CheckCircle : Icon.Circle}
                  shortcut={{ modifiers: ["ctrl"], key: "3" }}
                  onAction={() => setSort("hours-desc")}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Project Filter">
                <Action
                  title="All Projects"
                  icon={selectedProjectId === "all" ? Icon.CheckCircle : Icon.Circle}
                  shortcut={{ modifiers: ["cmd"], key: "0" }}
                  onAction={() => setSelectedProjectId("all")}
                />
                {projects.map((p, idx) => (
                  <Action
                    key={p.id}
                    title={p.name}
                    icon={selectedProjectId === p.id ? Icon.CheckCircle : Icon.Circle}
                    shortcut={idx < 9 ? { modifiers: ["cmd"], key: String(idx + 1) as any } : undefined}
                    onAction={() => setSelectedProjectId(p.id)}
                  />
                ))}
                <Action
                  title="No Project"
                  icon={selectedProjectId === 0 ? Icon.CheckCircle : Icon.Circle}
                  onAction={() => setSelectedProjectId(0)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />

        {/* One item per calendar week */}
        {calendarWeeks.map((week, wi) => {
          const weekHours = week.filter((d) => d.isCurrentMonth).reduce((s, d) => s + d.hours, 0)
          const firstCurrentDay = week.find((d) => d.isCurrentMonth)
          return (
            <List.Item
              key={wi}
              title={renderWeekRow(week)}
              subtitle={weekHours > 0 ? formatHours(weekHours) : ""}
              accessories={[
                {
                  text: firstCurrentDay ? `W${wi + 1}` : "",
                  icon: Icon.Minus,
                },
              ]}
              actions={
                <ActionPanel>
                  {firstCurrentDay && (
                    <Action
                      title="Add Time Entry"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() => openAddForm(firstCurrentDay.dateString)}
                    />
                  )}
                  <Action title="Previous Month" icon={Icon.ChevronLeft} shortcut={{ modifiers: ["cmd"], key: "[" }} onAction={prevMonth} />
                  <Action title="Next Month" icon={Icon.ChevronRight} shortcut={{ modifiers: ["cmd"], key: "]" }} onAction={nextMonth} />
                </ActionPanel>
              }
            />
          )
        })}
      </List.Section>

      {/* Day-by-day breakdown */}
      <List.Section
        title="Daily Breakdown"
        subtitle={`${filter !== "all" ? `Filter: ${filter}` : "All days"}${selectedProjectId !== "all" ? ` · ${projects.find((p) => p.id === selectedProjectId)?.name ?? "No project"}` : ""}`}
      >
        {allDays.length === 0 && !isLoading && (
          <List.Item
            title="No days match the current filter"
            icon={Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action title="Clear Filters" icon={Icon.XMarkCircle} onAction={() => { setFilter("all"); setSelectedProjectId("all") }} />
              </ActionPanel>
            }
          />
        )}

        {allDays.map((day) => {
          const dateObj = new Date(day.dateString + "T00:00:00")
          const weekdayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short" })
          const dateLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          const bar = activityBar(day.hours, maxHours)
          const block = ACTIVITY_BLOCKS[getActivityLevel(day.hours)]
          const todayBadge = day.isToday ? " ← today" : ""

          const accessories: List.Item.Accessory[] = []
          if (day.hours > 0) {
            accessories.push({ text: formatHours(day.hours) })
          }
          if (day.entries.length > 0) {
            accessories.push({
              icon: Icon.Clock,
              text: `${day.entries.length} entr${day.entries.length === 1 ? "y" : "ies"}`,
            })
          }

          return (
            <List.Item
              key={day.dateString}
              icon={day.hours > 0 ? { source: Icon.CircleFilled, tintColor: getBlockColor(getActivityLevel(day.hours)) } : Icon.Circle}
              title={`${block}  ${weekdayLabel} ${dateLabel}${todayBadge}`}
              subtitle={day.hours > 0 ? `${bar}  ${day.projects.join(", ")}` : "—"}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action
                    title="Add Time Entry"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => openAddForm(day.dateString)}
                  />
                  <Action
                    title="View Day Entries"
                    icon={Icon.List}
                    onAction={() =>
                      push(
                        <DayDetail
                          day={day}
                          projects={projects}
                          defaultBillableRate={defaultBillableRate}
                          onEntryAdded={loadAll}
                        />,
                      )
                    }
                  />
                  <Action title="Previous Month" icon={Icon.ChevronLeft} shortcut={{ modifiers: ["cmd"], key: "[" }} onAction={prevMonth} />
                  <Action title="Next Month" icon={Icon.ChevronRight} shortcut={{ modifiers: ["cmd"], key: "]" }} onAction={nextMonth} />
                  <ActionPanel.Section title="Filter">
                    <Action
                      title="Show All Days"
                      icon={filter === "all" ? Icon.CheckCircle : Icon.Circle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      onAction={() => setFilter("all")}
                    />
                    <Action
                      title="Days With Entries Only"
                      icon={filter === "with-entries" ? Icon.CheckCircle : Icon.Circle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                      onAction={() => setFilter("with-entries")}
                    />
                    <Action
                      title="Billable Entries Only"
                      icon={filter === "billable" ? Icon.CheckCircle : Icon.Circle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                      onAction={() => setFilter("billable")}
                    />
                    <Action
                      title="Weekdays Only"
                      icon={filter === "weekdays-only" ? Icon.CheckCircle : Icon.Circle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                      onAction={() => setFilter("weekdays-only")}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Sort">
                    <Action
                      title="Sort: Date ↑"
                      icon={sort === "date-asc" ? Icon.CheckCircle : Icon.Circle}
                      shortcut={{ modifiers: ["ctrl"], key: "1" }}
                      onAction={() => setSort("date-asc")}
                    />
                    <Action
                      title="Sort: Date ↓"
                      icon={sort === "date-desc" ? Icon.CheckCircle : Icon.Circle}
                      shortcut={{ modifiers: ["ctrl"], key: "2" }}
                      onAction={() => setSort("date-desc")}
                    />
                    <Action
                      title="Sort: Most Hours First"
                      icon={sort === "hours-desc" ? Icon.CheckCircle : Icon.Circle}
                      shortcut={{ modifiers: ["ctrl"], key: "3" }}
                      onAction={() => setSort("hours-desc")}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Project Filter">
                    <Action
                      title="All Projects"
                      icon={selectedProjectId === "all" ? Icon.CheckCircle : Icon.Circle}
                      shortcut={{ modifiers: ["cmd"], key: "0" }}
                      onAction={() => setSelectedProjectId("all")}
                    />
                    {projects.map((p, idx) => (
                      <Action
                        key={p.id}
                        title={p.name}
                        icon={selectedProjectId === p.id ? Icon.CheckCircle : Icon.Circle}
                        shortcut={idx < 9 ? { modifiers: ["cmd"], key: String(idx + 1) as any } : undefined}
                        onAction={() => setSelectedProjectId(p.id)}
                      />
                    ))}
                    <Action
                      title="No Project"
                      icon={selectedProjectId === 0 ? Icon.CheckCircle : Icon.Circle}
                      onAction={() => setSelectedProjectId(0)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Navigate">
                    <Action.OpenInBrowser title="Open TimeTracker" url="http://localhost:1337" icon={Icon.Globe} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          )
        })}
      </List.Section>

      {/* Summary strip */}
      <List.Section title="Month Summary">
        <List.Item
          title={`Total: ${formatHours(totalHours)}`}
          subtitle={`${workingDays} working day${workingDays !== 1 ? "s" : ""}  ·  avg ${formatHours(workingDays > 0 ? totalHours / workingDays : 0)}/day`}
          icon={Icon.BarChart}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open TimeTracker" url="http://localhost:1337" icon={Icon.Globe} />
            </ActionPanel>
          }
        />
        {projects
          .map((p) => {
            const pEntries = filteredEntries.filter((e) => e.projectId === p.id)
            const pHours = pEntries.reduce((s, e) => s + e.duration, 0)
            const pEarnings = pEntries.reduce((s, e) => s + e.duration * (e.billableRate ?? 0), 0)
            return { project: p, hours: pHours, earnings: pEarnings }
          })
          .filter((x) => x.hours > 0)
          .sort((a, b) => b.hours - a.hours)
          .map(({ project, hours, earnings }) => (
            <List.Item
              key={project.id}
              icon={{ source: Icon.CircleFilled, tintColor: project.color }}
              title={project.name}
              subtitle={formatHours(hours)}
              accessories={
                earnings > 0
                  ? [{ text: `$${earnings.toFixed(0)}`, icon: Icon.Coins }]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title={`Filter by ${project.name}`}
                    icon={Icon.Filter}
                    onAction={() => setSelectedProjectId(project.id)}
                  />
                  <Action title="Show All Projects" icon={Icon.XMarkCircle} onAction={() => setSelectedProjectId("all")} />
                  <Action.OpenInBrowser title="Open TimeTracker" url="http://localhost:1337" icon={Icon.Globe} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  )
}

// Map activity level to a Raycast Color for icon tinting
function getBlockColor(level: 0 | 1 | 2 | 3 | 4): Color {
  switch (level) {
    case 1: return Color.Green
    case 2: return Color.Blue
    case 3: return Color.Purple
    case 4: return Color.Red
    default: return Color.SecondaryText
  }
}
