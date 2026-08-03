"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, parseISO } from "date-fns";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClientProject {
  id: string;
  name: string;
}

interface CalendarEvent {
  id: string;
  date: string;
  type: string;
  description: string;
}

export default function HRCalendarPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEvent, setNewEvent] = useState({ type: "HOLIDAY", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const getAuthToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accessToken");
    }
    return null;
  };

  const fetchProjects = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch("/api/client-projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
        if (data.projects?.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedProject]);

  const fetchEvents = useCallback(async () => {
    if (!selectedProject) return;
    const token = getAuthToken();
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/client-projects/${selectedProject}/calendar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handlePreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDayClick = (day: Date) => {
    if (!selectedProject) {
      setError("Please select a project first.");
      return;
    }
    setSelectedDate(day);
    setNewEvent({ type: "HOLIDAY", description: "" });
    setDialogOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedDate) return;
    const token = getAuthToken();
    if (!token) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/client-projects/${selectedProject}/calendar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: format(selectedDate, "yyyy-MM-dd"),
          type: newEvent.type,
          description: newEvent.description,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        fetchEvents();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create event");
      }
    } catch (err) {
      setError("Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this event?")) return;

    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch(`/api/client-projects/${selectedProject}/calendar/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchEvents();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete event");
      }
    } catch (err) {
      setError("Failed to delete event");
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);
  const paddingDays = Array.from({ length: startDay }).fill(null);

  const getEventsForDay = (day: Date) => {
    return events.filter(e => isSameDay(parseISO(e.date), day));
  };

  return (
    <>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-indigo-500" />
              Project Calendar
            </h1>
            <p className="text-zinc-500 mt-2">Manage holidays and double-pay dates for client projects.</p>
          </div>

          <div className="flex items-center gap-4">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[240px] rounded-xl border-black/10 dark:border-white/10 dark:bg-zinc-800 bg-white">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-black/5 dark:border-white/5 shadow-xl">
                {projects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
            <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-900/50 rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handlePreviousMonth} className="rounded-xl border-black/10 dark:border-white/10">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth} className="rounded-xl border-black/10 dark:border-white/10">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {loading && selectedProject ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                <div key={dayName} className="text-center font-medium text-zinc-500 text-sm py-2">
                  {dayName}
                </div>
              ))}

              {paddingDays.map((_, i) => (
                <div key={`padding-${i}`} className="h-32 rounded-2xl border border-transparent"></div>
              ))}

              {daysInMonth.map((day, i) => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={i}
                    onClick={() => handleDayClick(day)}
                    className={`h-32 rounded-2xl border p-3 flex flex-col cursor-pointer transition-all hover:shadow-md ${
                      isToday
                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10"
                        : "border-black/5 dark:border-white/5 bg-white/40 dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-sm font-semibold ${isToday ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                        {format(day, "d")}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto mt-1 no-scrollbar">
                      {dayEvents.map(event => (
                        <div key={event.id} className={`text-xs px-2 py-1 rounded-md flex justify-between items-center group relative ${event.type === "HOLIDAY" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"}`}>
                          <span className="truncate max-w-[80%]" title={event.description}>
                            {event.type === "HOLIDAY" ? "?? Holiday" : "?? 2x Pay"}
                          </span>
                          <button onClick={(e) => handleDeleteEvent(event.id, e)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity absolute right-1 bg-white/80 dark:bg-black/50 rounded-sm p-0.5">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-black/[0.04] dark:border-white/[0.04] shadow-2xl rounded-[32px] p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Manage Date</DialogTitle>
            <DialogDescription>{selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEvent}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-zinc-700 dark:text-zinc-300">Event Type</Label>
                <Select value={newEvent.type} onValueChange={(val) => setNewEvent({ ...newEvent, type: val })}>
                  <SelectTrigger className="w-full rounded-xl border-black/10 dark:border-white/10 dark:bg-zinc-800 bg-white">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-black/5 dark:border-white/5 shadow-xl z-50">
                    <SelectItem value="HOLIDAY">Holiday</SelectItem>
                    <SelectItem value="DOUBLE_PAY">Double Pay (Working Day)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700 dark:text-zinc-300">Description (Optional)</Label>
                <Input value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="e.g. Independence Day" className="rounded-xl border-black/10 dark:border-white/10 bg-white/50 dark:bg-zinc-800/50" maxLength={50} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl border-black/10 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Cancel</Button>
              <Button type="submit" disabled={submitting} className="rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white shadow-xl">{submitting ? "Adding..." : "Add Event"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
