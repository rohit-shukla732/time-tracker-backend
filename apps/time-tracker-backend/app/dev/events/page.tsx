'use client';

import React, { useState, useEffect } from 'react';

interface EventRecord {
  id: string;
  type: string;
  timestamp: string;
  receivedAt: string;
  data: any;
  source: 'session' | 'events' | 'app-switch' | 'heartbeat';
}

interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  [key: string]: any;
}

const EVENT_SOURCES = [
  { key: 'session', url: '/api/session/start', label: 'Session Events' },
  { key: 'events', url: '/api/events', label: 'General Events' },
  { key: 'app-switch', url: '/api/app-switch', label: 'App Switch Events' },
  { key: 'heartbeat', url: '/api/heartbeat', label: 'Heartbeat Events' },
] as const;

export default function EventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAllEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allEvents: EventRecord[] = [];
      
      // Fetch from all endpoints
      for (const source of EVENT_SOURCES) {
        try {
          const response = await fetch(source.url, { cache: 'no-store' });
          if (!response.ok) continue;
          
          const data = await response.json();
          
          // Handle different response formats
          let records: any[] = [];
          if (Array.isArray(data)) {
            records = data;
          } else if (data.clients && Array.isArray(data.clients)) {
            // Heartbeat endpoint returns { clients: [...] }
            records = data.clients.map((client: any) => ({
              id: client.clientId || client.id,
              type: 'heartbeat',
              timestamp: client.lastSeen || new Date().toISOString(),
              clientId: client.clientId,
              alive: client.alive,
              secondsAgo: client.secondsAgo,
            }));
          } else if (data.data && Array.isArray(data.data)) {
            records = data.data;
          }
          
          // Convert to standardized EventRecord format
          const standardizedEvents: EventRecord[] = records.map((record: any) => ({
            id: record.id || record.clientId || `${source.key}-${Date.now()}-${Math.random()}`,
            type: record.type || source.key,
            timestamp: record.timestamp || record.lastSeen || record.receivedAt || new Date().toISOString(),
            receivedAt: record.receivedAt || new Date().toISOString(),
            data: record,
            source: source.key as any,
          }));
          
          allEvents.push(...standardizedEvents);
        } catch (err) {
          console.warn(`Failed to fetch from ${source.url}:`, err);
        }
      }
      
      // Sort by timestamp (newest first)
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setEvents(allEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllEvents();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchAllEvents, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredEvents = events.filter(event => {
    if (filterType !== 'all' && event.type !== filterType) return false;
    if (filterSource !== 'all' && event.source !== filterSource) return false;
    return true;
  });

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getEventTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'session_start': 'bg-green-100 text-green-800',
      'app_start': 'bg-blue-100 text-blue-800',
      'app_switch': 'bg-yellow-100 text-yellow-800',
      'heartbeat': 'bg-purple-100 text-purple-800',
      'break': 'bg-orange-100 text-orange-800',
      'idle': 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getSourceColor = (source: string) => {
    const colors: { [key: string]: string } = {
      'session': 'bg-green-50 border-green-200',
      'events': 'bg-blue-50 border-blue-200',
      'app-switch': 'bg-yellow-50 border-yellow-200',
      'heartbeat': 'bg-purple-50 border-purple-200',
    };
    return colors[source] || 'bg-gray-50 border-gray-200';
  };

  const uniqueTypes = [...new Set(events.map(e => e.type))];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Time Tracker Events Dashboard
        </h1>
        <p className="text-gray-600">
          Real-time view of all events from session, app-switch, heartbeat, and general event endpoints
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Source
          </label>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value="all">All Sources</option>
            {EVENT_SOURCES.map(source => (
              <option key={source.key} value={source.key}>{source.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoRefresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="autoRefresh" className="text-sm text-gray-700">
            Auto-refresh (5s)
          </label>
        </div>

        <button
          onClick={fetchAllEvents}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh Now'}
        </button>

        <button
          onClick={() => setEvents([])}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Clear All
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        {EVENT_SOURCES.map(source => {
          const count = events.filter(e => e.source === source.key).length;
          return (
            <div key={source.key} className={`p-4 rounded-lg border ${getSourceColor(source.key)}`}>
              <div className="text-sm font-medium text-gray-600">{source.label}</div>
              <div className="text-2xl font-bold text-gray-900">{count}</div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Events List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Events ({filteredEvents.length})
          </h2>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {loading ? 'Loading events...' : 'No events found with current filters.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEvents.map((event, index) => (
              <div key={`${event.id}-${index}`} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.type)}`}>
                        {event.type}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {event.source}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-900 font-mono bg-gray-50 p-3 rounded overflow-x-auto">
                      <pre>{JSON.stringify(event.data, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
