/**
 * Tipos compartidos entre frontend y backend
 * Compatible con Prisma schema y generación de Spring Boot
 */

// ========================
// Enums
// ========================

export enum Role {
  OWNER = "OWNER",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER",
}

// ========================
// Diagram Types
// ========================

export interface Field {
  id: string | number;
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeign?: boolean;
  nullable?: boolean;
  references?: string | null;
  referencesField?: string | null;
  relationType?: string;
  unique?: boolean;
  defaultValue?: string;
}

export interface TableData {
  name: string;
  label?: string;
  fields: Field[];
}

// ========================
// Prisma Models (API DTOs)
// ========================

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  users?: ProjectUser[];
  diagrams?: Diagram[];
}

export interface ProjectUser {
  id: string;
  role: Role;
  userId: string;
  projectId: string;
  user?: User;
  project?: Project;
}

export interface Diagram {
  id: string;
  projectId: string;
  authorId: string;
  name: string;
  data: any; // JSON
  version: number;
  createdAt: Date;
  updatedAt: Date;
  project?: Project;
  author?: User;
}

export interface Session {
  id: string;
  userId: string;
  diagramId: string;
  startedAt: Date;
  endedAt?: Date | null;
  lastPing: Date;
  user?: User;
  diagram?: Diagram;
}

export interface Lock {
  id: string;
  diagramId: string;
  resourceId: string;
  userId: string;
  acquiredAt: Date;
  expiresAt: Date;
  user?: User;
  diagram?: Diagram;
}

export interface DiagramChange {
  id: string;
  diagramId: string;
  userId: string;
  action: string;
  payload: any; // JSON
  createdAt: Date;
  user?: User;
  diagram?: Diagram;
}

export interface Invitation {
  id: string;
  projectId: string;
  email?: string | null;
  role: Role;
  token: string;
  createdAt: Date;
  acceptedAt?: Date | null;
  project?: Project;
}

// ========================
// WebSocket Events
// ========================

export interface PresenceUser {
  userId: string;
  name: string;
  role: Role;
  socketId: string;
}

export interface DiagramUpdatePayload {
  action: "ADD_NODE" | "UPDATE_NODE" | "DELETE_NODE" | "MOVE_NODE" | "ADD_EDGE" | "DELETE_EDGE";
  payload: any;
}

// ========================
// API Request/Response Types
// ========================

export interface LoginRequest {
  email: string;
  name: string;
}

export interface LoginResponse {
  id: string;
  email: string;
  name: string;
}

export interface CreateProjectRequest {
  name: string;
  userId: string;
  description?: string;
}

export interface CreateInvitationRequest {
  projectId: string;
  role: Role;
  email?: string;
}

export interface CreateInvitationResponse {
  token: string;
  url: string;
}

export interface AcceptInvitationRequest {
  token: string;
  userId: string;
}
