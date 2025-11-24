// Local types for the admin interface

export type Role = 'ADMIN' | 'MANAGER' | 'HR' | 'EMPLOYEE';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
  teamId?: string;
  team?: Team;
  managedTeams?: Team[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  manager?: User;
  members?: User[];
  createdAt: Date | string;
  updatedAt: Date | string;
}