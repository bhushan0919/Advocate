import { apiClient } from './client.ts';
import { DiaryResponse, DiarySummaryResponse } from '../types/diary.ts';

export const diaryApi = {
  getDailyDiary: async (date?: string): Promise<DiaryResponse> => {
    const res = await apiClient.get('/diary', { params: { date } });
    return res.data.data;
  },

  getDiarySummary: async (date?: string): Promise<DiarySummaryResponse> => {
    const res = await apiClient.get('/diary/summary', { params: { date } });
    return res.data.data;
  },
};

