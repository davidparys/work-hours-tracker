import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Icon,
} from "@raycast/api"
import { useState, useEffect } from "react"
import * as chrono from "chrono-node"

const API_BASE = "http://localhost:1337"

interface Project {
  id: number
  name: string
  color: string
  isActive?: boolean
  defaultBillableRate?: number | null
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

function formatHourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DURATIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 11, 12]

export default function QuickAdd() {
  const [projects, setProjects] = useState<Project[]>([])
  const [defaultBillableRate, setDefaultBillableRate] = useState<number | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Form state
  const [projectId, setProjectId] = useState<string>("")
  const [date, setDate] = useState<Date>(new Date())
  const [dateText, setDateText] = useState<string>("")
  const [dateError, setDateError] = useState<string | undefined>()
  const [startHour, setStartHour] = useState("9")
  const [duration, setDuration] = useState("1")
  const [billableRate, setBillableRate] = useState<string>("")
  const [description, setDescription] = useState("")
  const [durationError, setDurationError] = useState<string | undefined>()
  const [billableRateError, setBillableRateError] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [projectsRes, settingsRes] = await Promise.all([
          fetch(`${API_BASE}/api/projects`),
          fetch(`${API_BASE}/api/settings`),
        ])

        if (!projectsRes.ok || !settingsRes.ok) {
          throw new Error("Failed to load data from TimeTracker")
        }

        const projectsData = (await projectsRes.json()) as ApiResponse<Project[]>
        const settingsData = (await settingsRes.json()) as ApiResponse<{ user: { defaultBillableRate?: number | null } }>

        if (projectsData.success && projectsData.data) {
          setProjects(projectsData.data.filter((p) => p.isActive !== false))
        }
        if (settingsData.success && settingsData.data?.user?.defaultBillableRate != null) {
          const rate = settingsData.data.user.defaultBillableRate
          setDefaultBillableRate(rate)
          setBillableRate(String(rate))
        }
      } catch {
        setLoadError("Cannot connect to TimeTracker. Make sure the app is running on localhost:1337.")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  function handleProjectChange(id: string) {
    setProjectId(id)
    // Update billable rate field when project changes
    if (id) {
      const project = projects.find((p) => p.id === Number(id))
      if (project?.defaultBillableRate != null) {
        setBillableRate(String(project.defaultBillableRate))
        return
      }
    }
    setBillableRate(defaultBillableRate != null ? String(defaultBillableRate) : "")
  }

  function validateDuration(dur: string, start: string): string | undefined {
    const endHour = Number(start) + Number(dur)
    if (endHour > 24) {
      return `End time would be ${endHour}:00, exceeds 24:00`
    }
    return undefined
  }

  function validateBillableRate(value: string): string | undefined {
    if (value === "") return undefined
    const n = Number(value)
    if (isNaN(n) || n < 0) return "Must be a positive number"
    return undefined
  }

  function parseDateInput(text: string): Date | null {
    if (text.trim() === "") return new Date()
    // Use "past" forward date option — prefer dates in the past over future
    // so "8th April" resolves to the most recent April 8th, not next year
    const parsed = chrono.parseDate(text, new Date(), { forwardDate: false })
    return parsed
  }

  function handleDateChange(text: string) {
    setDateText(text)
    if (text.trim() === "") {
      setDate(new Date())
      setDateError(undefined)
      return
    }
    const parsed = parseDateInput(text)
    if (parsed) {
      setDate(parsed)
      setDateError(undefined)
    } else {
      setDateError("Couldn't parse date — try 'today', 'yesterday', '8 April', or '2026-04-08'")
    }
  }

  async function handleSubmit() {
    const durErr = validateDuration(duration, startHour)
    const rateErr = validateBillableRate(billableRate)
    const parsedDate = dateText.trim() === "" ? new Date() : parseDateInput(dateText)
    const dateErr = parsedDate ? undefined : "Couldn't parse date"
    if (durErr) setDurationError(durErr)
    if (rateErr) setBillableRateError(rateErr)
    if (dateErr) setDateError(dateErr)
    if (durErr || rateErr || dateErr) return

    setDurationError(undefined)
    setBillableRateError(undefined)
    setSubmitting(true)

    const start = Number(startHour)
    const dur = Number(duration)
    const end = start + dur

    const d = date || new Date()
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

    const resolvedRate = billableRate !== "" ? Number(billableRate) : undefined

    const payload = {
      date: dateStr,
      startHour: start,
      endHour: end,
      duration: dur,
      projectId: projectId ? Number(projectId) : null,
      billableRate: resolvedRate,
      description: description || undefined,
    }

    try {
      const response = await fetch(`${API_BASE}/api/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as ApiResponse<unknown>
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to add entry")
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Entry added",
        message: `${dur}h logged (${formatHourLabel(start)}–${formatHourLabel(end)})${resolvedRate != null ? ` @ ${resolvedRate}/hr` : ""}`,
      })
      await popToRoot()
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

  if (loadError) {
    return (
      <Form
        isLoading={false}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={() => popToRoot()} icon={Icon.ArrowClockwise} />
          </ActionPanel>
        }
      >
        <Form.Description title="Connection Error" text={loadError} />
      </Form>
    )
  }

  return (
    <Form
      isLoading={isLoading || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Entry" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="projectId"
        title="Project"
        value={projectId}
        onChange={handleProjectChange}
      >
        <Form.Dropdown.Item value="" title="No Project" />
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} value={String(p.id)} title={p.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="dateText"
        title="Date"
        placeholder={`today, yesterday, 8 April, ${new Date().getFullYear()}-04-08`}
        value={dateText}
        error={dateError}
        info={date ? `→ ${date.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}` : undefined}
        onChange={handleDateChange}
      />

      <Form.Dropdown
        id="startHour"
        title="Start Time"
        value={startHour}
        onChange={(v) => {
          setStartHour(v)
          setDurationError(validateDuration(duration, v))
        }}
      >
        {HOURS.map((h) => (
          <Form.Dropdown.Item key={h} value={String(h)} title={formatHourLabel(h)} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="duration"
        title="Duration (hours)"
        value={duration}
        error={durationError}
        onChange={(v) => {
          setDuration(v)
          setDurationError(validateDuration(v, startHour))
        }}
      >
        {DURATIONS.map((d) => (
          <Form.Dropdown.Item
            key={d}
            value={String(d)}
            title={`${d}h → ends ${formatHourLabel(Number(startHour) + d)}`}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="billableRate"
        title="Billable Rate (per hr)"
        placeholder="e.g. 95"
        value={billableRate}
        error={billableRateError}
        onChange={(v) => {
          setBillableRate(v)
          setBillableRateError(validateBillableRate(v))
        }}
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
