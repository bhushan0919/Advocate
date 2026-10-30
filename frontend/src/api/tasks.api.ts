import { apiClient } from './client';
import { TaskRecord, TaskFormData, TaskSummary, TaskStatus } from '../types/task';

export interface GetTasksParams {
  page?: number;
  limit?: number;
  search?: string;
  view?: 'all' | 'my' | 'assigned_by_me' | 'pending' | 'overdue' | 'completed';
  status?: string;
  priority?: string;
  caseId?: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface TaskListResponse {
  tasks: TaskRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const tasksApi = {
  getTasks: async (params?: GetTasksParams): Promise<TaskListResponse> => {
    const res = await apiClient.get('/tasks', { params });
    return res.data.data;
  },

  getTaskSummary: async (): Promise<TaskSummary> => {
    const res = await apiClient.get('/tasks/summary');
    return res.data.data;
  },

  getTask: async (id: string): Promise<TaskRecord> => {
    const res = await apiClient.get(`/tasks/${id}`);
    return res.data.data;
  },

  createTask: async (data: TaskFormData): Promise<TaskRecord> => {
    const res = await apiClient.post('/tasks', data);
    return res.data.data;
  },

  updateTask: async (id: string, data: Partial<TaskFormData>): Promise<TaskRecord> => {
    const res = await apiClient.put(`/tasks/${id}`, data);
    return res.data.data;
  },

  updateTaskStatus: async (id: string, status: TaskStatus): Promise<TaskRecord> => {
    const res = await apiClient.patch(`/tasks/${id}/status`, { status });
    return res.data.data;
  },

  addComment: async (id: string, comment: string): Promise<TaskRecord> => {
    const res = await apiClient.post(`/tasks/${id}/comments`, { comment });
    return res.data.data;
  },

  deleteTask: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },
};

