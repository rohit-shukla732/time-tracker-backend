"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckSquare,
  Circle,
  Clock,
  Play,
  Square,
  Plus,
} from "lucide-react";
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

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  project?: {
    id: string;
    name: string;
  };
}

interface CurrentTask {
  id: string;
  startedAt: string;
  task: Task;
}

interface TaskSelectorProps {
  sessionId: string | null;
}

export default function TaskSelector({ sessionId }: TaskSelectorProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<CurrentTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
  });

  useEffect(() => {
    if (sessionId) {
      fetchCurrentTask();
      fetchAvailableTasks();
    }
  }, [sessionId]);

  const fetchCurrentTask = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(
        `/api/tasks/current?sessionId=${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCurrentTask(data.activeTask);
      }
    } catch (error) {
      console.error("Error fetching current task:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTasks = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(
        "/api/tasks?status=ACTIVE&status=IN_PROGRESS",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const handleStartTask = async (taskId: string) => {
    if (!sessionId) {
      toast.error("No active session. Please start working first.");
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/tasks/${taskId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to start task");
      }

      const data = await response.json();
      setCurrentTask(data);
      setIsSelectDialogOpen(false);
      toast.success(`Started working on: ${data.task.title}`);
    } catch (error) {
      console.error("Error starting task:", error);
      toast.error("Failed to start task");
    }
  };

  const handleStopTask = async () => {
    if (!sessionId) {
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/tasks/current/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to stop task");
      }

      setCurrentTask(null);
      toast.success("Task session ended");
      fetchAvailableTasks();
    } catch (error) {
      console.error("Error stopping task:", error);
      toast.error("Failed to stop task");
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
        body: JSON.stringify(newTask),
      });

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      toast.success("Task created and sent for approval");
      setIsCreateDialogOpen(false);
      setNewTask({
        title: "",
        description: "",
        priority: "MEDIUM",
      });
      fetchAvailableTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
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

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const diff = now - start;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!sessionId) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            Loading tasks...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Current Task
          </CardTitle>
          <div className="flex gap-2">
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Request Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request New Task</DialogTitle>
                  <DialogDescription>
                    Create a task request. It will need manager approval.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="task-title">Task Title</Label>
                    <Input
                      id="task-title"
                      value={newTask.title}
                      onChange={(e) =>
                        setNewTask({ ...newTask, title: e.target.value })
                      }
                      placeholder="What do you want to work on?"
                    />
                  </div>
                  <div>
                    <Label htmlFor="task-desc">Description</Label>
                    <Textarea
                      id="task-desc"
                      value={newTask.description}
                      onChange={(e) =>
                        setNewTask({ ...newTask, description: e.target.value })
                      }
                      placeholder="Describe the task"
                    />
                  </div>
                  <div>
                    <Label htmlFor="task-priority">Priority</Label>
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
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTask}>Submit Request</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {!currentTask && (
              <Dialog
                open={isSelectDialogOpen}
                onOpenChange={setIsSelectDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Play className="h-4 w-4 mr-1" />
                    Select Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Select Task to Work On</DialogTitle>
                    <DialogDescription>
                      Choose a task from your assigned tasks
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {tasks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No tasks assigned to you
                      </div>
                    ) : (
                      tasks.map((task) => (
                        <div
                          key={task.id}
                          className="border rounded p-3 hover:bg-accent cursor-pointer"
                          onClick={() => handleStartTask(task.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{task.title}</h4>
                                <Badge variant={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                                {task.status === "IN_PROGRESS" && (
                                  <Badge variant="outline">
                                    <Clock className="h-3 w-3 mr-1" />
                                    In Progress
                                  </Badge>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {task.description}
                                </p>
                              )}
                              {task.project && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Project: {task.project.name}
                                </p>
                              )}
                            </div>
                            <Button size="sm" variant="ghost">
                              <Play className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {currentTask ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-medium">
                    {currentTask.task.title}
                  </span>
                  <Badge variant={getPriorityColor(currentTask.task.priority)}>
                    {currentTask.task.priority}
                  </Badge>
                </div>
                {currentTask.task.description && (
                  <p className="text-sm text-muted-foreground ml-4">
                    {currentTask.task.description}
                  </p>
                )}
                {currentTask.task.project && (
                  <p className="text-xs text-muted-foreground ml-4 mt-1">
                    Project: {currentTask.task.project.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground ml-4 mt-2">
                  Working for: {formatDuration(currentTask.startedAt)}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopTask}
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No task selected</p>
            <p className="text-sm">Select a task to start tracking your work</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
