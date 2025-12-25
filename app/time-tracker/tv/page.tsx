'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Coffee, Activity, Moon, Zap, TrendingUp, Monitor } from 'lucide-react';

interface TeamData {
  id: string;
  name: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
    status: 'working' | 'idle' | 'break' | 'offline';
    currentSession?: {
      startedAt: string;
      workTimeMs: number;
      breakTimeMs: number;
      idleTimeMs: number;
    };
  }>;
  stats: {
    working: number;
    idle: number;
    break: number;
    offline: number;
    totalWorkTimeMs: number;
    avgWorkTimeMs: number;
  };
}

export default function TVDisplay() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data every 30 seconds
  useEffect(() => {
    fetchTeamData();
    const interval = setInterval(fetchTeamData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate through teams every 15 seconds
  useEffect(() => {
    if (teams.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentTeamIndex((prev) => (prev + 1) % teams.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [teams.length]);

  async function fetchTeamData() {
    try {
      const response = await fetch('/api/tv/stats');
      const data = await response.json();
      
      if (data.success) {
        // Filter out IT team
        const filteredTeams = data.teams.filter((team: TeamData) => 
          team.name.toLowerCase() !== 'it' && team.name.toLowerCase() !== 'it team'
        );
        setTeams(filteredTeams);
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'break': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl text-white">Loading...</div>
      </div>
    );
  }

  const currentTeam = teams[currentTeamIndex];

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Clock className="h-12 w-12 text-blue-400" />
            <div>
              <h1 className="text-5xl font-bold text-white">Team Tracker</h1>
              <p className="text-2xl text-gray-300">Real-time Team Activity</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-white">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xl text-gray-300">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-4 gap-6">
          {teams.map((team) => {
            const totalMembers = team.members.length;
            return (
              <Card key={team.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-2xl text-white flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    {team.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-400">{team.stats.working}</div>
                        <div className="text-sm text-gray-400">Working</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-yellow-400">{team.stats.idle}</div>
                        <div className="text-sm text-gray-400">Idle</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-400">{team.stats.break}</div>
                        <div className="text-sm text-gray-400">Break</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-300">{totalMembers}</div>
                      <div className="text-sm text-gray-400">Total</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Team Details - Rotating View */}
      {currentTeam && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-4xl font-bold text-white flex items-center gap-3">
              <Users className="h-10 w-10 text-blue-400" />
              {currentTeam.name} Team
            </h2>
            <div className="flex gap-2">
              {teams.map((_, index) => (
                <div
                  key={index}
                  className={`h-3 w-3 rounded-full transition-all ${
                    index === currentTeamIndex ? 'bg-blue-400 w-8' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Team Members Floor Map Style Grid */}
          <div className="grid grid-cols-4 lg:grid-cols-6 gap-4">
            {currentTeam.members.map((member) => (
              <Card 
                key={member.id} 
                className={` transition-all relative ${
                  member.status === 'working' ? 'border-green-500/50' :
                  member.status === 'idle' ? 'border-yellow-500/50' :
                  member.status === 'break' ? 'border-blue-500/50' :
                  'border-gray-600/50'
                }`}
              >
                <CardContent className="p-4">
                  {/* Avatar and Name */}
                  <div className="flex flex-col items-center mb-3">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white mb-2 ${getStatusColor(member.status)}`}>
                      {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <h3 className="text-base font-semibold text-white text-center mb-0.5 line-clamp-1">
                      {member.name}
                    </h3>
                    <Badge 
                      variant="outline" 
                      className={`text-xs px-2 py-0.5 ${
                        member.status === 'working' ? 'border-green-500 text-green-400 bg-green-500/10' :
                        member.status === 'idle' ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' :
                        member.status === 'break' ? 'border-blue-500 text-blue-400 bg-blue-500/10' :
                        'border-gray-500 text-gray-400 bg-gray-500/10'
                      }`}
                    >
                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </Badge>
                  </div>

                  {/* Session Times */}
                  {member.currentSession ? (
                    <div className="space-y-2 pt-3 border-t border-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Zap className="h-3 w-3 text-green-400" />
                          Work
                        </span>
                        <span className="text-sm font-bold text-green-400">
                          {formatTime(member.currentSession.workTimeMs)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Coffee className="h-3 w-3 text-blue-400" />
                          Break
                        </span>
                        <span className="text-sm font-medium text-blue-400">
                          {formatTime(member.currentSession.breakTimeMs)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Moon className="h-3 w-3 text-yellow-400" />
                          Idle
                        </span>
                        <span className="text-sm font-medium text-yellow-400">
                          {formatTime(member.currentSession.idleTimeMs)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-slate-700 text-center">
                      <Monitor className="h-6 w-6 text-gray-600 mx-auto mb-1" />
                      <span className="text-xs text-gray-500">No active session</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
