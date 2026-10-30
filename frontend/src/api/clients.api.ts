import { apiClient } from './client.ts';
import { Client, ClientFormData, ClientListResponse, ClientProfileResponse } from '../types/client.ts';

export interface GetClientsParams {
  page?: number;
  limit?: number;
  search?: string;
  clientType?: string;
  includeArchived?: boolean;
}

export const clientsApi = {
  getClients: async (params?: GetClientsParams): Promise<ClientListResponse> => {
    const res = await apiClient.get('/clients', { params });
    return res.data.data;
  },

  getClient: async (id: string): Promise<ClientProfileResponse> => {
    const res = await apiClient.get(`/clients/${id}`);
    return res.data.data;
  },

  createClient: async (data: ClientFormData): Promise<Client> => {
    const res = await apiClient.post('/clients', data);
    return res.data.data;
  },

  updateClient: async (id: string, data: Partial<ClientFormData>): Promise<Client> => {
    const res = await apiClient.put(`/clients/${id}`, data);
    return res.data.data;
  },

  deleteClient: async (id: string): Promise<{ message: string; archived: boolean }> => {
    const res = await apiClient.delete(`/clients/${id}`);
    return {
      message: res.data.message,
      archived: res.data.archived,
    };
  },
};

