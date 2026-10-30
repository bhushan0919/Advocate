import { apiClient } from './client.ts';
import { CaseRecord, CaseFormData, CaseListResponse } from '../types/case.ts';

export interface GetCasesParams {
  page?: number;
  limit?: number;
  search?: string;
  caseNumber?: string;
  cnrNumber?: string;
  client?: string;
  opponent?: string;
  court?: string;
  caseType?: string;
  status?: string;
  hearingDate?: string;
  startDate?: string;
  endDate?: string;
  isArchived?: boolean | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const casesApi = {
  getCases: async (params?: GetCasesParams): Promise<CaseListResponse> => {
    const res = await apiClient.get('/cases', { params });
    return res.data.data;
  },

  getCase: async (id: string): Promise<CaseRecord> => {
    const res = await apiClient.get(`/cases/${id}`);
    return res.data.data;
  },

  createCase: async (data: CaseFormData): Promise<CaseRecord> => {
    const res = await apiClient.post('/cases', data);
    return res.data.data;
  },

  updateCase: async (id: string, data: Partial<CaseFormData>): Promise<CaseRecord> => {
    const res = await apiClient.put(`/cases/${id}`, data);
    return res.data.data;
  },

  archiveCase: async (id: string, isArchived?: boolean): Promise<CaseRecord> => {
    const res = await apiClient.patch(`/cases/${id}/archive`, { isArchived });
    return res.data.data;
  },
};

