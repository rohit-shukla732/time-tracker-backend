// Common types for the Time Tracker application

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  clientId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  isRunning: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeEntryCreateRequest {
  projectId: string;
  description?: string;
  startTime?: Date; // defaults to now if not provided
}

export interface TimeEntryUpdateRequest {
  description?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface TimeEntryStopRequest {
  endTime?: Date; // defaults to now if not provided
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Query parameters for time entries
export interface TimeEntriesQuery {
  userId?: string;
  projectId?: string;
  clientId?: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  page?: number;
  limit?: number;
  isRunning?: boolean;
}