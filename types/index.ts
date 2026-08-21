export enum Role {
  ADMIN = 'ADMIN',  SENIOR_MANAGER = 'SENIOR_MANAGER',  MANAGER = 'MANAGER',
  HR = 'HR',
  EMPLOYEE = 'EMPLOYEE',
}

export type RoleString = 'ADMIN' | 'SENIOR_MANAGER' | 'MANAGER' | 'HR' | 'EMPLOYEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Ticketing System Types
export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export interface TicketCategory {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
  subcategories?: TicketSubcategory[];
}

export interface TicketSubcategory {
  id: string;
  categoryId: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  categoryId: string | null;
  subcategoryId: string | null;
  createdBy: string;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  creator?: User;
  assignee?: User;
  category?: TicketCategory | null;
  subcategory?: TicketSubcategory | null;
  comments?: TicketComment[];
  screenshots?: TicketScreenshot[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  createdAt: Date;
  isInternal?: boolean;
  user?: User;
}

export interface TicketScreenshot {
  id: string;
  ticketId: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: Date;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  byCategory: {
    [key: string]: number;
  };
}
