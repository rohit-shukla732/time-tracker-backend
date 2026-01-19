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
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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
  ChevronsUpDown,
  Check,
  Search,
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
  team?: {
    id: string;
    name: string;
  };
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [createTaskAssigneePopoverOpen, setCreateTaskAssigneePopoverOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTaskAssigneePopoverOpen, setEditTaskAssigneePopoverOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    projectId: "__none__",
    assignedTo: [] as string[],
    priority: "MEDIUM",
    estimatedHours: "",
    dueDate: "",
  });

  const [editTask, setEditTask] = useState({
    title: "",
    description: "",
    projectId: "__none__",
    assignedTo: [] as string[],
    priority: "MEDIUM",
    status: "ACTIVE",
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
      const response = await fetch("/api/users?includeTeam=true", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeamMembers(Array.isArray(data.users) ? data.users : Array.isArray(data) ? data : []);
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
          assignedTo: newTask.assignedTo.length === 0 ? undefined : newTask.assignedTo[0],
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
        assignedTo: [],
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

  const openEditDialog = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTask({
      title: task.title,
      description: task.description || "",
      projectId: task.project?.id || "__none__",
      assignedTo: task.assignee ? [task.assignee.id] : [],
      priority: task.priority,
      status: task.status,
      estimatedHours: task.estimatedHours?.toString() || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!editingTaskId) return;

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/tasks/${editingTaskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...editTask,
          projectId: editTask.projectId === "__none__" ? undefined : editTask.projectId,
          assignedTo: editTask.assignedTo.length === 0 ? undefined : editTask.assignedTo[0],
          estimatedHours: editTask.estimatedHours
            ? parseFloat(editTask.estimatedHours)
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      toast.success("Task updated successfully");
      setIsEditDialogOpen(false);
      setEditingTaskId(null);
      setEditTask({
        title: "",
        description: "",
        projectId: "__none__",
        assignedTo: [],
        priority: "MEDIUM",
        status: "ACTIVE",
        estimatedHours: "",
        dueDate: "",
      });
      fetchTasks();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
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

  // Apply search filter
  const searchFilteredTasks = filteredTasks.filter((task) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower) ||
      task.assignee?.name?.toLowerCase().includes(searchLower) ||
      task.project?.name?.toLowerCase().includes(searchLower) ||
      task.team?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Apply assignee filter
  const finalFilteredTasks = selectedAssignees.length > 0
    ? searchFilteredTasks.filter((task) => 
        task.assignee ? selectedAssignees.includes(task.assignee.id) : selectedAssignees.includes("unassigned")
      )
    : searchFilteredTasks;

  const pendingApprovalCount = tasks.filter(
    (t) => t.status === "PENDING_APPROVAL"
  ).length;

  const toggleAssignee = (assigneeId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(assigneeId)
        ? prev.filter((id) => id !== assigneeId)
        : [...prev, assigneeId]
    );
  };

  const selectAllAssignees = () => {
    const allIds = teamMembers.map((m) => m.id);
    allIds.push("unassigned");
    setSelectedAssignees(allIds);
  };

  const clearAssignees = () => {
    setSelectedAssignees([]);
  };

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
                  <Label htmlFor="title" className="mb-1">Task Title</Label>
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
                  <Label htmlFor="description" className="mb-1">Description</Label>
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
                    <Label htmlFor="project" className="mb-1">Project (Optional)</Label>
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
                    <Label htmlFor="assignee" className="mb-1">Assign To</Label>
                    <Popover open={createTaskAssigneePopoverOpen} onOpenChange={setCreateTaskAssigneePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {newTask.assignedTo.length === 0
                            ? "Select team members"
                            : `${newTask.assignedTo.length} member(s) selected`}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search team members..." />
                          <CommandEmpty>No team member found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem 
                              onSelect={() => {
                                if (newTask.assignedTo.length === teamMembers.length) {
                                  setNewTask({ ...newTask, assignedTo: [] });
                                } else {
                                  setNewTask({ ...newTask, assignedTo: teamMembers.map(m => m.id) });
                                }
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  newTask.assignedTo.length === teamMembers.length
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              Select All
                            </CommandItem>
                            <CommandItem 
                              onSelect={() => setNewTask({ ...newTask, assignedTo: [] })}
                              className="cursor-pointer"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Clear All
                            </CommandItem>
                            {teamMembers.map((member) => (
                              <CommandItem
                                key={member.id}
                                onSelect={() => {
                                  const isSelected = newTask.assignedTo.includes(member.id);
                                  setNewTask({
                                    ...newTask,
                                    assignedTo: isSelected
                                      ? newTask.assignedTo.filter(id => id !== member.id)
                                      : [...newTask.assignedTo, member.id]
                                  });
                                }}
                                className="cursor-pointer"
                              >
                                <Checkbox
                                  checked={newTask.assignedTo.includes(member.id)}
                                  className="mr-2"
                                />
                                <div className="flex flex-col">
                                  <span>{member.name || member.email}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="priority" className="mb-1">Priority</Label>
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
                    <Label htmlFor="estimated" className="mb-1">Estimated Hours</Label>
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
                    <Label htmlFor="dueDate" className="mb-1">Due Date</Label>
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

          {/* Edit Task Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogDescription>
                  Update task details and status
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editTask.title}
                    onChange={(e) =>
                      setEditTask({ ...editTask, title: e.target.value })
                    }
                    placeholder="Task title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editTask.description}
                    onChange={(e) =>
                      setEditTask({ ...editTask, description: e.target.value })
                    }
                    placeholder="Task description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      value={editTask.status}
                      onValueChange={(value) =>
                        setEditTask({ ...editTask, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-priority">Priority</Label>
                    <Select
                      value={editTask.priority}
                      onValueChange={(value) =>
                        setEditTask({ ...editTask, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-project">Project</Label>
                    <Select
                      value={editTask.projectId}
                      onValueChange={(value) =>
                        setEditTask({ ...editTask, projectId: value })
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
                    <Label htmlFor="edit-assignee">Assign To</Label>
                    <Popover open={editTaskAssigneePopoverOpen} onOpenChange={setEditTaskAssigneePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {editTask.assignedTo.length === 0
                            ? "Select team members"
                            : `${editTask.assignedTo.length} member(s) selected`}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search team members..." />
                          <CommandEmpty>No team member found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem 
                              onSelect={() => {
                                if (editTask.assignedTo.length === teamMembers.length) {
                                  setEditTask({ ...editTask, assignedTo: [] });
                                } else {
                                  setEditTask({ ...editTask, assignedTo: teamMembers.map(m => m.id) });
                                }
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  editTask.assignedTo.length === teamMembers.length
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              Select All
                            </CommandItem>
                            <CommandItem 
                              onSelect={() => setEditTask({ ...editTask, assignedTo: [] })}
                              className="cursor-pointer"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Clear All
                            </CommandItem>
                            {teamMembers.map((member) => (
                              <CommandItem
                                key={member.id}
                                onSelect={() => {
                                  const isSelected = editTask.assignedTo.includes(member.id);
                                  setEditTask({
                                    ...editTask,
                                    assignedTo: isSelected
                                      ? editTask.assignedTo.filter(id => id !== member.id)
                                      : [...editTask.assignedTo, member.id]
                                  });
                                }}
                                className="cursor-pointer"
                              >
                                <Checkbox
                                  checked={editTask.assignedTo.includes(member.id)}
                                  className="mr-2"
                                />
                                <div className="flex flex-col">
                                  <span>{member.name || member.email}</span>
                                  {member.team && (
                                    <span className="text-xs text-muted-foreground">
                                      {member.team.name}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-estimated">Estimated Hours</Label>
                    <Input
                      id="edit-estimated"
                      type="number"
                      step="0.5"
                      value={editTask.estimatedHours}
                      onChange={(e) =>
                        setEditTask({
                          ...editTask,
                          estimatedHours: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-dueDate">Due Date</Label>
                    <Input
                      id="edit-dueDate"
                      type="date"
                      value={editTask.dueDate}
                      onChange={(e) =>
                        setEditTask({ ...editTask, dueDate: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingTaskId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateTask}>Update Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
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

        <div className="flex items-center gap-2">
          {/* Assignee Filter */}
          <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-[150px] justify-between">
                {selectedAssignees.length === 0
                  ? "All Assignees"
                  : `${selectedAssignees.length} selected`}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search assignees..." />
                <CommandEmpty>No assignee found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem onSelect={selectAllAssignees} className="cursor-pointer">
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        selectedAssignees.length === teamMembers.length + 1
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    />
                    Select All
                  </CommandItem>
                  <CommandItem onSelect={clearAssignees} className="cursor-pointer">
                    <XCircle className="mr-2 h-4 w-4" />
                    Clear All
                  </CommandItem>
                  <CommandItem
                    onSelect={() => toggleAssignee("unassigned")}
                    className="cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedAssignees.includes("unassigned")}
                      className="mr-2"
                    />
                    Unassigned
                  </CommandItem>
                  {teamMembers.map((member) => (
                    <CommandItem
                      key={member.id}
                      onSelect={() => toggleAssignee(member.id)}
                      className="cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedAssignees.includes(member.id)}
                        className="mr-2"
                      />
                      <div className="flex flex-col">
                        <span>{member.name || member.email}</span>
                        {member.team && (
                          <span className="text-xs text-muted-foreground">
                            {member.team.name}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Time Spent</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finalFilteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No tasks found
                  </TableCell>
                </TableRow>
              ) : (
                finalFilteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className="text-xs capitalize">
                          {task.status.replace("_", " ").toLowerCase()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.assignee ? (
                        <div>
                          <div className="text-sm">{task.assignee.name}</div>
                          {task.team && (
                            <div className="text-xs text-muted-foreground">
                              {task.team.name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.project ? (
                        <span className="text-sm">{task.project.name}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.totalTimeMs && task.totalTimeMs > 0 ? (
                        <span className="text-sm">{formatDuration(task.totalTimeMs)}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? (
                        <span className="text-sm">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {task.status === "PENDING_APPROVAL" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleApproveTask(task.id)}
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(task)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
