const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('admin_token');
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || data.message || 'Request failed');
  }

  return data;
}

// API functions
export const api = {
  // Users
  getUsers: () => apiRequest('/users'),
  updateUserRole: (userId: string, role: string) => 
    apiRequest(`/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  // Teams
  getTeams: () => apiRequest('/teams'),
  createTeam: (team: { name: string; description?: string; managerId?: string }) =>
    apiRequest('/teams', {
      method: 'POST',
      body: JSON.stringify(team),
    }),
  addTeamMember: (teamId: string, userId: string) =>
    apiRequest(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  removeTeamMember: (teamId: string, userId: string) =>
    apiRequest(`/teams/${teamId}/members?userId=${userId}`, {
      method: 'DELETE',
    }),

  // Dashboard
  getDashboard: (timeRange = '7d') => apiRequest(`/dashboard?timeRange=${timeRange}`),

  // Health
  getHealth: () => apiRequest('/health'),
};