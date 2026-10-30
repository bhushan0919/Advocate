import { apiClient } from './client.ts';
import {
  CalendarEventsResponse,
  CalendarSummaryResponse,
  CalendarDateDetailsResponse,
  CalendarFilterParams,
} from '../types/calendar.ts';

export const calendarApi = {
  getEvents: async (params?: CalendarFilterParams): Promise<CalendarEventsResponse> => {
    const res = await apiClient.get('/calendar', { params });
    return res.data.data;
  },

  getSummary: async (params?: CalendarFilterParams): Promise<CalendarSummaryResponse> => {
    const res = await apiClient.get('/calendar/summary', { params });
    return res.data.data;
  },

  getDateDetails: async (
    date: string,
    params?: Omit<CalendarFilterParams, 'startDate' | 'endDate'>
  ): Promise<CalendarDateDetailsResponse> => {
    const res = await apiClient.get(`/calendar/date/${date}`, { params });
    return res.data.data;
  },
};

