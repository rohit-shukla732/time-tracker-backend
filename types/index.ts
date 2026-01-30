export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  HR = 'HR',
  EMPLOYEE = 'EMPLOYEE',
}

export type RoleString = 'ADMIN' | 'MANAGER' | 'HR' | 'EMPLOYEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id: string;
  userId: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END';
  timestamp: Date;
  location?: string;
  notes?: string;
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

export enum TicketCategory {
  IT_SUPPORT = 'IT_SUPPORT',
}

export enum ITSupportSubcategory {
  HARDWARE = 'HARDWARE',
  SOFTWARE = 'SOFTWARE',
  NETWORK = 'NETWORK',
  EMAIL = 'EMAIL',
  ACCESS = 'ACCESS',
  PRINTER = 'PRINTER',
  PHONE = 'PHONE',
  OTHER = 'OTHER',
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: TicketCategory;
  subcategory?: ITSupportSubcategory;
  createdBy: string;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  creator?: User;
  assignee?: User;
  comments?: TicketComment[];
  screenshots?: TicketScreenshot[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  createdAt: Date;
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

// Asset Management Types
export enum AssetType {
  USER_SIDE = 'USER_SIDE',
  IT_INFRASTRUCTURE = 'IT_INFRASTRUCTURE',
}

export enum AssetCategory {
  // User Side Assets
  LAPTOP = 'LAPTOP',
  KEYBOARD = 'KEYBOARD',
  MOUSE = 'MOUSE',
  HEADSET = 'HEADSET',
  MONITOR = 'MONITOR',
  
  // IT Infrastructure Assets
  SWITCH = 'SWITCH',
  FIREWALL = 'FIREWALL',
  ACCESS_POINT = 'ACCESS_POINT',
  BIOMETRIC = 'BIOMETRIC',
  TELEPHONE_MATRIX = 'TELEPHONE_MATRIX',
  TELEPHONE_HANDSET = 'TELEPHONE_HANDSET',
  CCTV_CAMERA = 'CCTV_CAMERA',
  NVR = 'NVR',
  INTERNET_LINE = 'INTERNET_LINE',
}

export enum AssetStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  RETIRED = 'RETIRED',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
}

export enum AssignmentStatus {
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
}

export enum AssetCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  DAMAGED = 'DAMAGED',
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  INSPECTION = 'INSPECTION',
  UPGRADE = 'UPGRADE',
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Asset {
  id: string;
  assetType: AssetType;
  category: AssetCategory;
  name: string;
  description?: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  purchaseCost?: number;
  currentValue?: number;
  status: AssetStatus;
  location?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  assignments?: AssetAssignment[];
  maintenanceRecords?: AssetMaintenance[];
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  userId: string;
  assignedBy: string;
  assignedDate: Date;
  returnedDate?: Date;
  expectedReturnDate?: Date;
  status: AssignmentStatus;
  condition?: AssetCondition;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  asset?: Asset;
  user?: User;
  assignedByUser?: User;
}

export interface AssetMaintenance {
  id: string;
  assetId: string;
  maintenanceType: MaintenanceType;
  description: string;
  scheduledDate: Date;
  completedDate?: Date;
  cost?: number;
  performedBy?: string;
  status: MaintenanceStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  asset?: Asset;
}

export interface AssetStats {
  overview: {
    totalAssets: number;
    availableAssets: number;
    assignedAssets: number;
    inMaintenanceAssets: number;
    damagedAssets: number;
    userSideAssets: number;
    itInfrastructureAssets: number;
    activeAssignments: number;
    pendingMaintenance: number;
  };
  assetsByCategory: Array<{ category: AssetCategory; count: number }>;
  recentAssignments: AssetAssignment[];
  upcomingMaintenance: AssetMaintenance[];
}