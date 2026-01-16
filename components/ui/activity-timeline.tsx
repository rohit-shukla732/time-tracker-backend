"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, Monitor, Coffee, Timer, Activity } from "lucide-react";

interface TimelineEntry {
  timestamp: Date;
  type: "session_start" | "app" | "break" | "idle" | "session_end";
  appName?: string;
  durationMs: number;
  reason?: string;
}

interface ActivityTimelineProps {
  sessionStart: string;
  sessionEnd: string | null;
  summary?: {
    workTimeMs: number;
    totalBreakMs: number;
    totalIdleMs: number;
  };
  appUsage?: Array<{
    appName?: string;
    timeMs?: number;
  }>;
  websiteUsage?: Array<{
    website?: string;
    browser?: string;
    timeMs?: number;
  }>;
  appSwitchEvents: Array<{
    fromApp: string;
    toApp: string;
    timestamp: string;
    durationMs: number;
  }>;
  events: Array<{
    type: string;
    reason: string | null;
    timestamp: string;
    durationMs: number;
  }>;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  } else if (minutes > 0) {
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  } else {
    return `${seconds}s`;
  }
}

// Generate consistent color for app names
function getAppColor(appName: string, index: number): string {
  const colors = [
    "bg-blue-500 hover:bg-blue-600",
    "bg-indigo-500 hover:bg-indigo-600",
    "bg-purple-500 hover:bg-purple-600",
    "bg-pink-500 hover:bg-pink-600",
    "bg-cyan-500 hover:bg-cyan-600",
    "bg-teal-500 hover:bg-teal-600",
    "bg-emerald-500 hover:bg-emerald-600",
    "bg-lime-500 hover:bg-lime-600",
    "bg-sky-500 hover:bg-sky-600",
    "bg-violet-500 hover:bg-violet-600",
  ];

  // Generate hash from app name for consistent colors
  let hash = 0;
  for (let i = 0; i < appName.length; i++) {
    hash = appName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function ActivityTimeline({
  sessionStart,
  sessionEnd,
  summary,
  appUsage,
  websiteUsage,
  appSwitchEvents,
  events,
}: ActivityTimelineProps) {
  // Debug: Log the incoming data
  console.log("ActivityTimeline Data:", {
    sessionStart,
    sessionEnd,
    summary,
    appUsage,
    appSwitchEventsCount: appSwitchEvents?.length || 0,
    eventsCount: events?.length || 0,
  });

  // Build chronological timeline using timestamps to calculate actual durations
  const timeline: TimelineEntry[] = [];

  // Add session start
  timeline.push({
    timestamp: new Date(sessionStart),
    type: "session_start",
    durationMs: 0,
  });

  // Sort all events by timestamp
  const allEvents = [
    ...appSwitchEvents.map((e) => ({ ...e, eventType: "app" as const })),
    ...events.map((e) => ({
      ...e,
      eventType: e.type.toLowerCase().includes("break")
        ? ("break" as const)
        : ("idle" as const),
    })),
  ].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate duration for each event based on time until next event
  allEvents.forEach((event, index) => {
    const currentTime = new Date(event.timestamp).getTime();
    const nextEvent = allEvents[index + 1];
    const sessionEndTime = sessionEnd
      ? new Date(sessionEnd).getTime()
      : Date.now();
    const nextTime = nextEvent
      ? new Date(nextEvent.timestamp).getTime()
      : sessionEndTime;

    // Calculate actual duration until next event or session end
    const calculatedDuration = nextTime - currentTime;

    if (event.eventType === "app") {
      const appEvent = event as (typeof appSwitchEvents)[0] & {
        eventType: "app";
      };
      timeline.push({
        timestamp: new Date(appEvent.timestamp),
        type: "app",
        appName: appEvent.toApp,
        durationMs: calculatedDuration,
      });
    } else {
      timeline.push({
        timestamp: new Date(event.timestamp),
        type: event.eventType,
        durationMs: calculatedDuration,
        reason: "reason" in event ? event.reason || undefined : undefined,
      });
    }
  });

  // Add session end if available
  if (sessionEnd) {
    timeline.push({
      timestamp: new Date(sessionEnd),
      type: "session_end",
      durationMs: 0,
    });
  }

  // Sort by timestamp
  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Use summary data if available, otherwise calculate from events
  const totalActiveMs =
    summary?.workTimeMs ||
    timeline
      .filter((entry) => entry.type === "app")
      .reduce((sum, entry) => sum + entry.durationMs, 0);

  const totalBreakMs =
    summary?.totalBreakMs ||
    timeline
      .filter((entry) => entry.type === "break")
      .reduce((sum, entry) => sum + entry.durationMs, 0);

  const totalIdleMs =
    summary?.totalIdleMs ||
    timeline
      .filter((entry) => entry.type === "idle")
      .reduce((sum, entry) => sum + entry.durationMs, 0);

  const totalTimeMs = totalActiveMs + totalBreakMs + totalIdleMs;

  console.log("Timeline calculations:", {
    totalActiveMs,
    totalBreakMs,
    totalIdleMs,
    totalTimeMs,
    timelineEntriesWithDuration: timeline.filter((e) => e.durationMs > 0)
      .length,
  });

  // Group activities by type for summary
  const appActivities = timeline.filter((e) => e.type === "app");
  const breakActivities = timeline.filter((e) => e.type === "break");
  const idleActivities = timeline.filter((e) => e.type === "idle");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Chronological view of session activities
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats - 2 Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Time Stats Card */}
          <Card className="p-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {formatDuration(totalActiveMs)}
                </div>
                <div className="text-[10px] text-muted-foreground">Active</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {formatDuration(totalBreakMs)}
                </div>
                <div className="text-[10px] text-muted-foreground">Break</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-600">
                  {formatDuration(totalIdleMs)}
                </div>
                <div className="text-[10px] text-muted-foreground">Idle</div>
              </div>
            </div>
          </Card>

          {/* Total Apps Card */}
          <Card className="p-3 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold">{appUsage?.length || 0}</div>
              <div className="text-[10px] text-muted-foreground">Total Apps</div>
            </div>
          </Card>
        </div>

        {/* Apps List with Browser Subsections - Compact */}
        <div className="mb-4 space-y-2">
          {appUsage?.slice(0, 5).map((app, index) => {
            if (!app.appName) return null;
            
            const isBrowser =
              app.appName.toLowerCase().includes("chrome") ||
              app.appName.toLowerCase().includes("firefox") ||
              app.appName.toLowerCase().includes("edge") ||
              app.appName.toLowerCase().includes("safari") ||
              app.appName.toLowerCase().includes("brave") ||
              app.appName.toLowerCase().includes("browser");

            const browserWebsites = isBrowser
              ? websiteUsage?.filter(
                  (w) =>
                    w.browser?.toLowerCase() === app.appName?.toLowerCase()
                )
              : [];

            return (
              <div key={index} className="border rounded p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{app.appName}</span>
                  <Badge variant="secondary" className="text-xs">
                    {formatDuration(app.timeMs ?? 0)}
                  </Badge>
                </div>

                {isBrowser &&
                  browserWebsites &&
                  browserWebsites.length > 0 && (
                    <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-muted pl-2">
                      {browserWebsites.slice(0, 3).map((site, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="truncate flex-1 text-muted-foreground">
                            {site.website}
                          </span>
                          <span className="text-muted-foreground text-[10px] ml-2">
                            {formatDuration(site.timeMs ?? 0)}
                          </span>
                        </div>
                      ))}
                      {browserWebsites.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{browserWebsites.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
              </div>
            );
          })}
        </div>

        {/* Proportional Timeline Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Session Timeline</span>
            <span className="text-sm text-muted-foreground">
              {formatDuration(totalTimeMs)} total
            </span>
          </div>
          <div className="h-12 w-full rounded-lg overflow-hidden flex shadow-sm border border-gray-200 dark:border-gray-700">
            {timeline
              .filter((e) => e.durationMs > 0)
              .map((entry, index) => {
                const percent =
                  totalTimeMs > 0 ? (entry.durationMs / totalTimeMs) * 100 : 0;
                const bgColor =
                  entry.type === "app"
                    ? getAppColor(entry.appName || "Unknown", index)
                    : entry.type === "break"
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-yellow-500 hover:bg-yellow-600";

                const label =
                  entry.type === "app"
                    ? entry.appName
                    : entry.type === "break"
                    ? "Break"
                    : "Idle";

                return (
                  <div
                    key={index}
                    className={`${bgColor} transition-colors relative group cursor-pointer`}
                    style={{ width: `${percent}%` }}
                    title={`${label}: ${formatDuration(
                      entry.durationMs
                    )} (${percent.toFixed(1)}%)`}
                  >
                    {percent > 5 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] text-white font-medium px-1 truncate">
                          {percent > 15 ? label : ""}
                        </span>
                      </div>
                    )}
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {label}: {formatDuration(entry.durationMs)}
                      <div className="text-[10px] opacity-75">
                        {format(entry.timestamp, "HH:mm:ss")}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-orange-500"></div>
              <span className="text-xs text-muted-foreground">Break</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-yellow-500"></div>
              <span className="text-xs text-muted-foreground">Idle</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
