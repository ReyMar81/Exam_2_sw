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

/**
 * Tipos de relación soportados:
 * - Crow's Foot (legacy): 1-1, 1-N, N-N, FK
 * - UML 2.5: ASSOCIATION, AGGREGATION, COMPOSITION, INHERITANCE, DEPENDENCY, REALIZATION
 */
export enum RelationType {
  // Crow's Foot (legacy - mantener retrocompatibilidad)
  ONE_TO_ONE = "1-1",
  ONE_TO_MANY = "1-N",
  MANY_TO_MANY = "N-N",
  FOREIGN_KEY = "FK",
  
  // UML 2.5
  ASSOCIATION = "ASSOCIATION",        // Línea continua simple
  AGGREGATION = "AGGREGATION",        // Línea con rombo blanco
  COMPOSITION = "COMPOSITION",        // Línea con rombo negro
  INHERITANCE = "INHERITANCE",        // Línea con triángulo blanco (generalización)
  DEPENDENCY = "DEPENDENCY",          // Línea punteada con flecha
  REALIZATION = "REALIZATION",        // Línea punteada con triángulo blanco
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
  // 🆕 UML 2.5: Comportamiento de CASCADE
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
  onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
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
