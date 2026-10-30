export type ClientType = 'Individual' | 'Corporate' | 'Government' | 'Other';

export interface Client {
  _id: string;
  workspaceId: string;
  fullName: string;
  mobile: string;
  email?: string;
  address?: string;
  clientType: ClientType;
  notes?: string;
  isArchived: boolean;
  caseCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFormData {
  fullName: string;
  mobile: string;
  email?: string;
  address?: string;
  clientType: ClientType;
  notes?: string;
}

export interface ClientListResponse {
  clients: Client[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ClientProfileResponse {
  client: Client;
  cases: import('./case.js').CaseRecord[];
}

