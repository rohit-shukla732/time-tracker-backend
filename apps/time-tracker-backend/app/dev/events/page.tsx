"use client";
import { useEffect, useState } from "react";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/time-events");
      const json = await res.json();
      setEvents(json.reverse()); // newest first
    };

    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  // ---- FILTER GROUPS ----
  const systemEvents = events.filter((e) =>
    ["app_start", "session_end"].includes(e.type)
  );

  const attendanceEvents = events.filter((e) =>
    [
      "auto_clock_in",
      "auto_clock_out",
      "break_start",
      "break_end",
      "idle_start",
      "idle_end",
    ].includes(e.type)
  );

  const appSwitchEvents = events.filter((e) => e.type === "app_switch");

  // New: App Usage summary only comes during clock_out
  const appUsageEvents = attendanceEvents.filter(
    (e) => e.type === "auto_clock_out" && e.appUsage
  );

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <h1>📡 Incoming Desktop Events</h1>
      <p>Auto-refresh every 2 seconds</p>

      <button onClick={() => setEvents([])} className="absolute top-4 right-4 w-fit border border-gray-600 rounded px-2 py-1 bg-gray-800 cursor-pointer ">Clear</button>

      {/* 4 Columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        {/* -------------------- SYSTEM EVENTS -------------------- */}
        <div>
          <h2>🖥️ System</h2>
          {systemEvents.length === 0 && <p>No system events…</p>}

          {systemEvents.map((e) => (
            <div
              key={e.id}
              style={{
                padding: 10,
                background: "#111",
                color: "#0f0",
                marginBottom: 15,
                borderRadius: 6,
              }}
            >
              <strong>{e.type}</strong>
              <br />
              Time: {e.timestamp}
              <br />
              Session: {e.sessionId}
            </div>
          ))}
        </div>

        {/* -------------------- ATTENDANCE -------------------- */}
        <div>
          <h2>⏱️ Attendance</h2>
          {attendanceEvents.length === 0 && <p>No attendance events…</p>}

          {attendanceEvents.map((e) => (
            <div
              key={e.id}
              style={{
                padding: 10,
                background: "#111",
                color: "#0af",
                marginBottom: 15,
                borderRadius: 6,
              }}
            >
              <strong>{e.type}</strong>
              <br />
              Trigger: {e.trigger}
              <br />
              Time: {e.timestamp}
            </div>
          ))}
        </div>

        {/* -------------------- APP SWITCH -------------------- */}
        <div>
          <h2>🔄 App Switch</h2>
          {appSwitchEvents.length === 0 && <p>No switches…</p>}

          {appSwitchEvents.map((e) => (
            <div
              key={e.id}
              style={{
                padding: 10,
                background: "#111",
                color: "#fa0",
                marginBottom: 15,
                borderRadius: 6,
              }}
            >
              <strong>{e.from || "unknown"} → {e.to}</strong>
              <br />
              Duration: {e.duration}ms
              <br />
              Time: {e.timestamp}
            </div>
          ))}
        </div>

        {/* -------------------- APP USAGE SUMMARY -------------------- */}
        <div>
          <h2>📊 App Usage</h2>

          {appUsageEvents.length === 0 && <p>No usage summaries yet…</p>}

          {appUsageEvents.map((e) => (
            <div
              key={e.id}
              style={{
                padding: 10,
                background: "#111",
                color: "#0ff",
                marginBottom: 15,
                borderRadius: 6,
              }}
            >
              <strong>Clock Out Summary</strong>
              <br />
              Time: {e.timestamp}
              <br />
              <br />
              <strong>Total Apps:</strong> {e.appUsage.totalApps}
              <br />
              <strong>Total Time:</strong> {(e.appUsage.totalTrackedTime / 1000).toFixed(1)}s
              <br />
              <br />
              <strong>Top Apps:</strong>
              <ul>
                {e.appUsage.topApps.map((app: any) => (
                  <li key={app.app}>
                    {app.app} — {(app.timeMs / 1000).toFixed(1)}s
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
