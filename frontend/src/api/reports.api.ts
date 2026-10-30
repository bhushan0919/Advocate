import { apiClient } from './client';
import {
  OverviewReportData,
  CasesReportData,
  HearingsReportData,
  DiaryReportData,
  TasksReportData,
  ClientsReportData,
  StaffReportData,
  ReportFilterParams,
} from '../types/report';

export const reportsApi = {
  getOverview: async (): Promise<OverviewReportData> => {
    const res = await apiClient.get('/reports/overview');
    return res.data.data;
  },

  getCasesReport: async (params?: ReportFilterParams): Promise<CasesReportData> => {
    const res = await apiClient.get('/reports/cases', { params });
    return res.data.data;
  },

  getHearingsReport: async (params?: ReportFilterParams): Promise<HearingsReportData> => {
    const res = await apiClient.get('/reports/hearings', { params });
    return res.data.data;
  },

  getDiaryReport: async (params?: ReportFilterParams): Promise<DiaryReportData> => {
    const res = await apiClient.get('/reports/diary', { params });
    return res.data.data;
  },

  getTasksReport: async (params?: ReportFilterParams): Promise<TasksReportData> => {
    const res = await apiClient.get('/reports/tasks', { params });
    return res.data.data;
  },

  getClientsReport: async (): Promise<ClientsReportData> => {
    const res = await apiClient.get('/reports/clients');
    return res.data.data;
  },

  getStaffReport: async (): Promise<StaffReportData> => {
    const res = await apiClient.get('/reports/staff');
    return res.data.data;
  },

  /**
   * Export PDF report
   */
  exportPdf: async (reportType: string, params?: ReportFilterParams): Promise<void> => {
    const res = await apiClient.get('/reports/export/pdf', {
      params: { reportType, ...params },
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `advd-${reportType}-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },

  /**
   * Export Excel report
   */
  exportExcel: async (reportType: string, params?: ReportFilterParams): Promise<void> => {
    const res = await apiClient.get('/reports/export/excel', {
      params: { reportType, ...params },
      responseType: 'blob',
    });

    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `advd-${reportType}-${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },
};

