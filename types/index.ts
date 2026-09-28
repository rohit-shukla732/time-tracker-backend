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

export enum TicketType {
  SUPPORT = 'SUPPORT',
  ONBOARDING = 'ONBOARDING',
  OFFBOARDING = 'OFFBOARDING',
}

export enum EquipmentCategory {
  LAPTOP = 'LAPTOP',
  MONITOR = 'MONITOR',
  KEYBOARD = 'KEYBOARD',
  MOUSE = 'MOUSE',
  HEADSET = 'HEADSET',
  SEAT = 'SEAT',
  OTHER = 'OTHER',
}

export enum EquipmentAction {
  ISSUED = 'ISSUED',
  REPLACED = 'REPLACED',
  RETURNED = 'RETURNED',
  RELOCATED = 'RELOCATED',
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
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  categoryId: string | null;
  subcategoryId: string | null;
  createdBy: string;
  assignedTo: string | null;
  relatedEmployeeId: string | null;
  relatedName: string | null;
  relatedEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  creator?: User;
  assignee?: User;
  relatedEmployee?: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
  subjects?: TicketSubjectInfo[];
  category?: TicketCategory | null;
  subcategory?: TicketSubcategory | null;
  comments?: TicketComment[];
  screenshots?: TicketScreenshot[];
  checklist?: ChecklistItem[];
}

export interface TicketSubjectInfo {
  id: string;
  ticketId: string;
  employeeId: string | null;
  name: string | null;
  email: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
  employee?: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
}

export interface ChecklistItem {
  id: string;
  ticketId: string;
  title: string;
  order: number;
  done: boolean;
  doneById: string | null;
  doneAt: Date | null;
  note: string | null;
  subjectId?: string | null;
  equipmentCategory: EquipmentCategory | null;
  equipmentAction: EquipmentAction | null;
  createdAt: Date;
  updatedAt: Date;
  doneBy?: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
  subject?: TicketSubjectInfo | null;
}

export interface ChecklistTemplate {
  id: string;
  type: TicketType;
  name: string;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  items?: ChecklistTemplateItem[];
}

export interface ChecklistTemplateItem {
  id: string;
  templateId: string;
  title: string;
  order: number;
  optional: boolean;
  equipmentCategory: EquipmentCategory | null;
  equipmentAction: EquipmentAction | null;
  createdAt: Date;
}

export interface EquipmentChange {
  id: string;
  userId: string | null;
  ticketId: string | null;
  subjectName: string | null;
  subjectEmail: string | null;
  subjectId?: string | null;
  category: EquipmentCategory;
  action: EquipmentAction;
  label: string | null;
  note: string | null;
  changedAt: Date;
  recordedById: string;
  createdAt: Date;
  recordedBy?: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
  ticket?: {
    id: string;
    ticketNumber: number;
    title: string;
    type?: TicketType;
  } | null;
}

export interface EquipmentSubject {
  id: string;
  userId: string | null;
  subjectName: string | null;
  subjectEmail: string | null;
  isPending: boolean;
}

export interface EquipmentSummary {
  [category: string]: {
    total: number;
    byAction: Record<string, number>;
  };
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
