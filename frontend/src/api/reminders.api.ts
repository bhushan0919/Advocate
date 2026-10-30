import { apiClient } from './client';
import { ReminderRecord, ReminderFormData } from '../types/reminder';

export interface GetRemindersParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'hearing' | 'custom' | 'all';
  status?: string;
  priority?: string;
  caseId?: string;
  dueToday?: boolean | string;
  upcoming?: boolean | string;
  overdue?: boolean | string;
}

export interface ReminderListResponse {
  reminders: ReminderRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const remindersApi = {
  getReminders: async (params?: GetRemindersParams): Promise<ReminderListResponse> => {
    const res = await apiClient.get('/reminders', { params });
    return res.data.data;
  },

  getReminder: async (id: string): Promise<ReminderRecord> => {
    const res = await apiClient.get(`/reminders/${id}`);
    return res.data.data;
  },

  createReminder: async (data: ReminderFormData): Promise<ReminderRecord> => {
    const res = await apiClient.post('/reminders', data);
    return res.data.data;
  },

  generateHearingReminders: async (
    caseId: string,
    hearingDate?: string,
    intervals?: string[]
  ): Promise<ReminderRecord[]> => {
    const res = await apiClient.post('/reminders/generate-hearing-reminders', {
      caseId,
      hearingDate,
      intervals,
    });
    return res.data.data;
  },

  updateReminder: async (id: string, data: Partial<ReminderFormData>): Promise<ReminderRecord> => {
    const res = await apiClient.put(`/reminders/${id}`, data);
    return res.data.data;
  },

  completeReminder: async (id: string): Promise<ReminderRecord> => {
    const res = await apiClient.patch(`/reminders/${id}/complete`);
    return res.data.data;
  },

  dismissReminder: async (id: string): Promise<ReminderRecord> => {
    const res = await apiClient.patch(`/reminders/${id}/dismiss`);
    return res.data.data;
  },

  snoozeReminder: async (id: string, minutes: number = 60): Promise<ReminderRecord> => {
    const res = await apiClient.patch(`/reminders/${id}/snooze`, { minutes });
    return res.data.data;
  },

  deleteReminder: async (id: string): Promise<void> => {
    await apiClient.delete(`/reminders/${id}`);
  },

  processDueNow: async (): Promise<{ triggered: number }> => {
    const res = await apiClient.post('/reminders/process-due');
    return res.data.data;
  },
};

