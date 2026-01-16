"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  CheckCircle,
  Circle,
  Clock,
  XCircle,
  AlertCircle,
  Pencil,
  Trash2,
  FolderOpen,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  estimatedHours?: number;
  createdAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  approvedBy?: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    id: string;
    name: string;
  };
  team: {
    id: string;
    name: string;
  };
  totalTimeMs?: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    projectId: "__none__",
    assignedTo: "__none__",
    priority: "MEDIUM",
    estimatedHours: "",
    dueDate: "",
  });

  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    fetchTasks();
    fetchTeamMembers();
    fetchProjects();
  }, []);

  const fetchTasks = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/tasks", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to fetch tasks");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeamMembers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
      setTeamMembers([]);
    }
  };

  const fetchProjects = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/projects", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title) {
      toast.error("Task title is required");
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...newTask,
          projectId: newTask.projectId === "__none__" ? undefined : newTask.projectId,
          assignedTo: newTask.assignedTo === "__none__" ? undefined : newTask.assignedTo,
          estimatedHours: newTask.estimatedHours
            ? parseFloat(newTask.estimatedHours)
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      toast.success("Task created successfully");
      setIsCreateDialogOpen(false);
      setNewTask({
        title: "",
        description: "",
        projectId: "__none__",
        assignedTo: "__none__",
        priority: "MEDIUM",
        estimatedHours: "",
        dueDate: "",
      });
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name) {
      toast.error("Project name is required");
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(newProject),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      toast.success("Project created successfully");
      setIsProjectDialogOpen(false);
      setNewProject({
        name: "",
        description: "",
      });
      fetchProjects();
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    }
  };

  const handleApproveTask = async (taskId: string) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/tasks/${taskId}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to approve task");
      }

      toast.success("Task approved");
      fetchTasks();
    } catch (error) {
      console.error("Error approving task:", error);
      toast.error("Failed to approve task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      toast.success("Task deleted");
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "ACTIVE":
        return <Circle className="h-4 w-4 text-blue-500" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "destructive";
      case "HIGH":
        return "default";
      case "MEDIUM":
        return "secondary";
      case "LOW":
        return "outline";
      default:
        return "secondary";
    }
  };

  const filteredTasks =
    filterStatus === "all"
      ? tasks
      : tasks.filter((task) => task.status === filterStatus);

  const pendingApprovalCount = tasks.filter(
    (t) => t.status === "PENDING_APPROVAL"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Task Management</h1>
          <p className="text-muted-foreground">
            Manage and assign tasks to your team
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog
            open={isProjectDialogOpen}
            onOpenChange={setIsProjectDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderOpen className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Create a project to organize related tasks
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <Label htmlFor="project-desc">Description</Label>
                  <Textarea
                    id="project-desc"
                    value={newProject.description}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        description: e.target.value,
                      })
                    }
                    placeholder="Project description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsProjectDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateProject}>Create Project</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Assign a task to a team member
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    placeholder="Task description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project">Project (Optional)</Label>
                    <Select
                      value={newTask.projectId}
                      onValueChange={(value) =>
                        setNewTask({ ...newTask, projectId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No Project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="assignee">Assign To</Label>
                    <Select
                      value={newTask.assignedTo}
                      onValueChange={(value) =>
                        setNewTask({ ...newTask, assignedTo: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name || member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) =>
                        setNewTask({ ...newTask, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="estimated">Estimated Hours</Label>
                    <Input
                      id="estimated"
                      type="number"
                      step="0.5"
                      value={newTask.estimatedHours}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          estimatedHours: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) =>
                        setNewTask({ ...newTask, dueDate: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateTask}>Create Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterStatus === "all" ? "default" : "outline"}
          onClick={() => setFilterStatus("all")}
          size="sm"
        >
          All ({tasks.length})
        </Button>
        <Button
          variant={filterStatus === "PENDING_APPROVAL" ? "default" : "outline"}
          onClick={() => setFilterStatus("PENDING_APPROVAL")}
          size="sm"
        >
          Pending Approval ({pendingApprovalCount})
        </Button>
        <Button
          variant={filterStatus === "ACTIVE" ? "default" : "outline"}
          onClick={() => setFilterStatus("ACTIVE")}
          size="sm"
        >
          Active
        </Button>
        <Button
          variant={filterStatus === "IN_PROGRESS" ? "default" : "outline"}
          onClick={() => setFilterStatus("IN_PROGRESS")}
          size="sm"
        >
          In Progress
        </Button>
        <Button
          variant={filterStatus === "COMPLETED" ? "default" : "outline"}
          onClick={() => setFilterStatus("COMPLETED")}
          size="sm"
        >
          Completed
        </Button>
      </div>

      {/* Tasks Grid */}
      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No tasks found
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(task.status)}
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <Badge variant={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      {task.status === "PENDING_APPROVAL" && (
                        <Badge variant="outline" className="text-yellow-600">
                          Needs Approval
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {task.status === "PENDING_APPROVAL" && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveTask(task.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {task.project && (
                    <div>
                      <span className="text-muted-foreground">Project:</span>
                      <div className="font-medium">{task.project.name}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Assigned to:</span>
                    <div className="font-medium">
                      {task.assignee?.name || "Unassigned"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created by:</span>
                    <div className="font-medium">{task.createdBy.name}</div>
                  </div>
                  {task.totalTimeMs && task.totalTimeMs > 0 && (
                    <div>
                      <span className="text-muted-foreground">Time spent:</span>
                      <div className="font-medium">
                        {formatDuration(task.totalTimeMs)}
                      </div>
                    </div>
                  )}
                  {task.estimatedHours && (
                    <div>
                      <span className="text-muted-foreground">Estimated:</span>
                      <div className="font-medium">
                        {task.estimatedHours}h
                      </div>
                    </div>
                  )}
                  {task.dueDate && (
                    <div>
                      <span className="text-muted-foreground">Due date:</span>
                      <div className="font-medium">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
