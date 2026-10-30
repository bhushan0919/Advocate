import { apiClient } from './client.ts';
import {
  HearingRecord,
  CreateHearingPayload,
  CorrectHearingPayload,
  HearingListResponse,
} from '../types/hearing.ts';

export interface GetHearingsParams {
  page?: number;
  limit?: number;
  search?: string;
  caseNumber?: string;
  client?: string;
  opponent?: string;
  court?: string;
  caseType?: string;
  hearingDate?: string;
  startDate?: string;
  endDate?: string;
  updatedBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const hearingsApi = {
  createCaseHearing: async (
    caseId: string,
    payload: CreateHearingPayload
  ): Promise<{ hearing: HearingRecord; case: any }> => {
    const res = await apiClient.post(`/cases/${caseId}/hearings`, payload);
    return res.data.data;
  },

  getCaseHearings: async (caseId: string): Promise<HearingRecord[]> => {
    const res = await apiClient.get(`/cases/${caseId}/hearings`);
    return res.data.data;
  },

  getWorkspaceHearings: async (params?: GetHearingsParams): Promise<HearingListResponse> => {
    const res = await apiClient.get('/hearings', { params });
    return res.data.data;
  },

  getHearingById: async (id: string): Promise<HearingRecord> => {
    const res = await apiClient.get(`/hearings/${id}`);
    return res.data.data;
  },

  correctHearing: async (id: string, payload: CorrectHearingPayload): Promise<HearingRecord> => {
    const res = await apiClient.patch(`/hearings/${id}/correct`, payload);
    return res.data.data;
  },
};

