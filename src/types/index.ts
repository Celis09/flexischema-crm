/**
 * GLOBAL TYPE DEFINITIONS
 * ------------------------
 * This file acts as the single source of truth for the core data models 
 * used throughout the application. Centralizing these interfaces ensures
 * consistency across API calls, components, and hooks.
 */
export type UserRole = "Admin" | "Editor" | "Viewer";

export interface ExtraFieldDefinition {
  id?: number | string;
  extraFieldDefinitionId?: number | string;
  fieldName: string;
  fieldType: string;
  isActive: boolean;
  createdDate?: string;
  updatedDate?: string;
}

export interface ExtraField {
  extraFieldDefinitionId: number | string;
  fieldName: string;
  fieldValue: string;
}

export interface Contact {
  id?: number | string;
  name: string;
  email: string;
  status: string | number;
  createdDate?: string;
  updatedDate?: string;
  extraFields?: ExtraField[];
}

export interface PaginatedResponse<T> {
  items: T[];
  totalPages: number;
  totalCount: number;
}
