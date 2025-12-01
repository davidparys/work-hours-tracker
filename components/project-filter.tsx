"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type Project } from "@/lib/database"

interface ProjectFilterProps {
  projects: Project[]
  selectedProjectId: number | undefined
  onProjectChange: (projectId: number | undefined) => void
}

export function ProjectFilter({ projects, selectedProjectId, onProjectChange }: ProjectFilterProps) {
  return (
    <div className="w-[200px]">
      <Select
        value={selectedProjectId?.toString() || "all"}
        onValueChange={(value) => onProjectChange(value === "all" ? undefined : Number(value))}
      >
        <SelectTrigger>
          <SelectValue placeholder="All Projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id!.toString()}>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                {project.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
