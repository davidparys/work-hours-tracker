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

export default function QuickAdd() {
  const [projects, setProjects] = useState<Project[]>([])
  const [defaultBillableRate, setDefaultBillableRate] = useState<number | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Form state
  const [projectId, setProjectId] = useState<string>("")
  const [date, setDate] = useState<Date>(new Date())
  const [startHour, setStartHour] = useState("9")
  const [endHour, setEndHour] = useState("10")
  const [billableRate, setBillableRate] = useState<string>("")
  const [description, setDescription] = useState("")
  const [endHourError, setEndHourError] = useState<string | undefined>()
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

  function validateEndHour(end: string, start: string): string | undefined {
    if (Number(end) <= Number(start)) {
      return "End time must be after start time"
    }
    return undefined
  }

  function validateBillableRate(value: string): string | undefined {
    if (value === "") return undefined
    const n = Number(value)
    if (isNaN(n) || n < 0) return "Must be a positive number"
    return undefined
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
    const duration = end - start

    const d = date || new Date()
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

    const resolvedRate = billableRate !== "" ? Number(billableRate) : undefined

    const payload = {
      date: dateStr,
      startHour: start,
      endHour: end,
      duration,
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
        message: `${duration}h logged${resolvedRate != null ? ` @ ${resolvedRate}/hr` : ""}`,
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

      <Form.DatePicker
        id="date"
        title="Date"
        type={Form.DatePicker.Type.Date}
        value={date}
        onChange={(d) => setDate(d ?? new Date())}
      />

      <Form.Dropdown
        id="startHour"
        title="Start Time"
        value={startHour}
        onChange={(v) => {
          setStartHour(v)
          setEndHourError(validateEndHour(endHour, v))
        }}
      >
        {HOURS.map((h) => (
          <Form.Dropdown.Item key={h} value={String(h)} title={formatHourLabel(h)} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="endHour"
        title="End Time"
        value={endHour}
        error={endHourError}
        onChange={(v) => {
          setEndHour(v)
          setEndHourError(validateEndHour(v, startHour))
        }}
      >
        {HOURS.map((h) => (
          <Form.Dropdown.Item key={h} value={String(h)} title={formatHourLabel(h)} />
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
