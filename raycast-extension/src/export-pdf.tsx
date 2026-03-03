import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Icon,
  open,
} from "@raycast/api"
import { useState, useEffect } from "react"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

const API_BASE = "http://localhost:1337"
const META_PATH = path.join(os.homedir(), ".timetracker-last-pdf")

interface Project {
  id: number
  name: string
  color: string
  isActive?: boolean
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

type ReportStyle = "professional" | "visual"
type DatePreset = "today" | "this-week" | "this-month" | "last-month" | "custom"

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getPresetDates(preset: DatePreset): { startDate: Date; endDate: Date } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (preset) {
    case "today": {
      return { startDate: today, endDate: today }
    }
    case "this-week": {
      const start = new Date(today)
      start.setDate(today.getDate() - today.getDay()) // Sunday
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { startDate: start, endDate: end }
    }
    case "this-month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { startDate: start, endDate: end }
    }
    case "last-month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      return { startDate: start, endDate: end }
    }
    default:
      return { startDate: today, endDate: today }
  }
}

export default function ExportPDF() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // Form state
  const [projectId, setProjectId] = useState<string>("")
  const [preset, setPreset] = useState<DatePreset>("this-month")
  const [startDate, setStartDate] = useState<Date>(getPresetDates("this-month").startDate)
  const [endDate, setEndDate] = useState<Date>(getPresetDates("this-month").endDate)
  const [style, setStyle] = useState<ReportStyle>("professional")
  const [dateRangeError, setDateRangeError] = useState<string | undefined>()

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch(`${API_BASE}/api/projects`)
        if (!res.ok) throw new Error("Failed to load projects")
        const data = (await res.json()) as ApiResponse<Project[]>
        if (data.success && data.data) {
          setProjects(data.data.filter((p) => p.isActive !== false))
        }
      } catch {
        setLoadError("Cannot connect to TimeTracker. Make sure the app is running on localhost:1337.")
      } finally {
        setIsLoading(false)
      }
    }
    loadProjects()
  }, [])

  function handlePresetChange(value: string) {
    const p = value as DatePreset
    setPreset(p)
    if (p !== "custom") {
      const { startDate: s, endDate: e } = getPresetDates(p)
      setStartDate(s)
      setEndDate(e)
      setDateRangeError(undefined)
    }
  }

  function validateDates(start: Date, end: Date): string | undefined {
    if (end < start) return "End date must be on or after start date"
    return undefined
  }

  async function handleExport() {
    const err = validateDates(startDate, endDate)
    if (err) {
      setDateRangeError(err)
      return
    }
    setDateRangeError(undefined)
    setExporting(true)

    const toast = await showToast({ style: Toast.Style.Animated, title: "Generating PDF…" })

    try {
      const params = new URLSearchParams({
        startDate: toDateStr(startDate),
        endDate: toDateStr(endDate),
        style,
      })
      if (projectId) params.set("projectId", projectId)

      const res = await fetch(`${API_BASE}/api/export/pdf?${params.toString()}`)

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error ?? `Server error ${res.status}`)
      }

      // Derive filename from Content-Disposition or X-Filename header, fallback to generic
      const xFilename = res.headers.get("X-Filename")
      const contentDisposition = res.headers.get("Content-Disposition") ?? ""
      const cdMatch = contentDisposition.match(/filename="([^"]+)"/)
      const filename = xFilename ?? cdMatch?.[1] ?? `time-report-${toDateStr(startDate)}-to-${toDateStr(endDate)}.pdf`

      const buffer = Buffer.from(await res.arrayBuffer())
      const downloadsDir = path.join(os.homedir(), "Downloads")
      const filePath = path.join(downloadsDir, filename)

      fs.writeFileSync(filePath, buffer)

      // Persist the last exported path so other commands can find it
      const metaPath = path.join(os.homedir(), ".timetracker-last-pdf")
      fs.writeFileSync(metaPath, filePath, "utf8")

      toast.style = Toast.Style.Success
      toast.title = "PDF saved"
      toast.message = filename
      toast.primaryAction = {
        title: "Open File",
        onAction: async () => {
          await open(filePath)
          await popToRoot()
        },
      }
      toast.secondaryAction = {
        title: "Show in Finder",
        onAction: async () => {
          await open(downloadsDir)
          await popToRoot()
        },
      }
    } catch (err: any) {
      toast.style = Toast.Style.Failure
      toast.title = "Export failed"
      toast.message = err?.message ?? "Unknown error"
    } finally {
      setExporting(false)
    }
  }

  async function handleOpenLastPDF() {
    if (!fs.existsSync(META_PATH)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No PDF exported yet",
        message: "Export a report first.",
      })
      return
    }
    const filePath = fs.readFileSync(META_PATH, "utf8").trim()
    if (!fs.existsSync(filePath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "File not found",
        message: `${path.basename(filePath)} no longer exists in Downloads.`,
      })
      return
    }
    await open(filePath)
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
      isLoading={isLoading || exporting}
      actions={
        <ActionPanel>
          <Action title="Export PDF to Downloads" onAction={handleExport} icon={Icon.Download} />
          <Action
            title="Open Last PDF in Finder"
            onAction={handleOpenLastPDF}
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="projectId" title="Project" value={projectId} onChange={setProjectId}>
        <Form.Dropdown.Item value="" title="All Projects" />
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} value={String(p.id)} title={p.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="preset" title="Date Range" value={preset} onChange={handlePresetChange}>
        <Form.Dropdown.Item value="today" title="Today" />
        <Form.Dropdown.Item value="this-week" title="This Week" />
        <Form.Dropdown.Item value="this-month" title="This Month" />
        <Form.Dropdown.Item value="last-month" title="Last Month" />
        <Form.Dropdown.Item value="custom" title="Custom Range" />
      </Form.Dropdown>

      {preset === "custom" && (
        <>
          <Form.DatePicker
            id="startDate"
            title="Start Date"
            type={Form.DatePicker.Type.Date}
            value={startDate}
            onChange={(d) => {
              const next = d ?? new Date()
              setStartDate(next)
              setDateRangeError(validateDates(next, endDate))
            }}
          />
          <Form.DatePicker
            id="endDate"
            title="End Date"
            type={Form.DatePicker.Type.Date}
            value={endDate}
            error={dateRangeError}
            onChange={(d) => {
              const next = d ?? new Date()
              setEndDate(next)
              setDateRangeError(validateDates(startDate, next))
            }}
          />
        </>
      )}

      <Form.Dropdown
        id="style"
        title="Report Style"
        value={style}
        onChange={(v) => setStyle(v as ReportStyle)}
      >
        <Form.Dropdown.Item value="professional" title="Professional" />
        <Form.Dropdown.Item value="visual" title="Visual" />
      </Form.Dropdown>
    </Form>
  )
}
