"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, Plus, Trash2, Edit3, Palette, DollarSign } from "lucide-react"
import { type Project, db } from "@/lib/database"
import { cn } from "@/lib/utils"

const PRESET_COLORS = [
  "#164e63", // Primary cyan
  "#10b981", // Accent green
  "#0891b2", // Light blue
  "#4b5563", // Gray
  "#7c3aed", // Purple
  "#dc2626", // Red
  "#ea580c", // Orange
  "#ca8a04", // Yellow
  "#059669", // Emerald
  "#0284c7", // Sky blue
]

interface ProjectManagerProps {
  children: React.ReactNode
  onProjectsChange?: () => void
}

export function ProjectManager({ children, onProjectsChange }: ProjectManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [newProject, setNewProject] = useState({
    name: "",
    color: PRESET_COLORS[0],
    defaultBillableRate: "" as string,
  })

  useEffect(() => {
    if (isOpen) {
      loadProjects()
    }
  }, [isOpen])

  const loadProjects = async () => {
    try {
      const projectList = await db.getProjects()
      setProjects(projectList)
    } catch (error) {
      console.error("Failed to load projects:", error)
    }
  }

  const handleAddProject = async () => {
    if (!newProject.name.trim()) {
      alert("Project name is required")
      return
    }

    try {
      const project = await db.addProject({
        name: newProject.name.trim(),
        color: newProject.color,
        defaultBillableRate: newProject.defaultBillableRate ? parseFloat(newProject.defaultBillableRate) : null,
      })

      setProjects([...projects, project])
      setNewProject({ name: "", color: PRESET_COLORS[0], defaultBillableRate: "" })
      setIsAddingProject(false)
      onProjectsChange?.()
    } catch (error) {
      console.error("Failed to add project:", error)
      alert("Failed to add project. Please try again.")
    }
  }

  const handleUpdateProject = async () => {
    if (!editingProject || !editingProject.id) return

    if (!editingProject.name.trim()) {
      alert("Project name is required")
      return
    }

    try {
      const updated = await db.updateProject(editingProject.id, {
        name: editingProject.name.trim(),
        color: editingProject.color,
        defaultBillableRate: editingProject.defaultBillableRate ?? null,
      })

      setProjects(projects.map((p) => (p.id === updated.id ? updated : p)))
      setEditingProject(null)
      onProjectsChange?.()
    } catch (error) {
      console.error("Failed to update project:", error)
      alert("Failed to update project. Please try again.")
    }
  }

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return
    }

    try {
      await db.deleteProject(projectId)
      setProjects(projects.filter((p) => p.id !== projectId))
      onProjectsChange?.()
    } catch (error) {
      console.error("Failed to delete project:", error)
      alert("Failed to delete project. Please try again.")
    }
  }

  const ColorPicker = ({
    selectedColor,
    onColorChange,
  }: {
    selectedColor: string
    onColorChange: (color: string) => void
  }) => (
    <div className="grid grid-cols-5 gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={cn(
            "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
            selectedColor === color ? "border-foreground shadow-md" : "border-border",
          )}
          style={{ backgroundColor: color }}
          onClick={() => onColorChange(color)}
          title={color}
        />
      ))}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Projects
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Project */}
          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Projects</CardTitle>
                <Button onClick={() => setIsAddingProject(true)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Project
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isAddingProject && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>Project Name</Label>
                    <Input
                      placeholder="Enter project name"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && handleAddProject()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Default Billable Rate (optional)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        placeholder="0.00 per hour"
                        value={newProject.defaultBillableRate}
                        onChange={(e) => setNewProject({ ...newProject, defaultBillableRate: e.target.value })}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Prefills the billable rate when this project is selected</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Color</Label>
                    <ColorPicker
                      selectedColor={newProject.color}
                      onColorChange={(color) => setNewProject({ ...newProject, color })}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleAddProject} size="sm">
                      Add Project
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddingProject(false)
                        setNewProject({ name: "", color: PRESET_COLORS[0], defaultBillableRate: "" })
                      }}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Edit Project Form */}
              {editingProject && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Editing Project</span>
                  </div>
                  <div className="space-y-2">
                    <Label>Project Name</Label>
                    <Input
                      placeholder="Enter project name"
                      value={editingProject.name}
                      onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdateProject()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Default Billable Rate (optional)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        placeholder="0.00 per hour"
                        value={editingProject.defaultBillableRate ?? ""}
                        onChange={(e) =>
                          setEditingProject({
                            ...editingProject,
                            defaultBillableRate: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Prefills the billable rate when this project is selected</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Color</Label>
                    <ColorPicker
                      selectedColor={editingProject.color}
                      onColorChange={(color) => setEditingProject({ ...editingProject, color })}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleUpdateProject} size="sm">
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingProject(null)}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing Projects */}
              <div className="space-y-3 mt-4">
                {projects.length === 0 && !isAddingProject && !editingProject ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No projects yet</p>
                    <p className="text-sm">Create your first project to organize your time tracking</p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: project.color }} />
                        <span className="font-medium">{project.name}</span>
                        {project.defaultBillableRate != null && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <DollarSign className="h-3 w-3" />
                            {project.defaultBillableRate}/hr
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingProject(project)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProject(project.id!)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Projects help you categorize and analyze your time tracking data</p>
              <p>• Choose distinct colors to easily identify projects in your activity views</p>
              <p>• Project data will appear in your PDF exports for detailed reporting</p>
              <p>• You can assign projects when creating time entries in the day view</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setIsOpen(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
