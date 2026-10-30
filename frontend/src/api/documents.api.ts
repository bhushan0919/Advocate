import { apiClient } from './client';
import {
  DocumentRecord,
  DocumentFilterParams,
  DocumentListResponse,
} from '../types/document';

export const documentsApi = {
  getDocuments: async (params?: DocumentFilterParams): Promise<DocumentListResponse> => {
    const res = await apiClient.get('/documents', { params });
    return res.data.data;
  },

  getDocument: async (id: string): Promise<DocumentRecord> => {
    const res = await apiClient.get(`/documents/${id}`);
    return res.data.data;
  },

  uploadDocument: async (formData: FormData): Promise<DocumentRecord> => {
    const res = await apiClient.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  updateDocument: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      category?: string;
      caseId?: string | null;
      clientId?: string | null;
    }
  ): Promise<DocumentRecord> => {
    const res = await apiClient.patch(`/documents/${id}`, data);
    return res.data.data;
  },

  deleteDocument: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/documents/${id}`);
    return res.data;
  },

  getCaseDocuments: async (caseId: string): Promise<DocumentRecord[]> => {
    const res = await apiClient.get(`/cases/${caseId}/documents`);
    return res.data.data;
  },

  uploadCaseDocument: async (caseId: string, formData: FormData): Promise<DocumentRecord> => {
    const res = await apiClient.post(`/cases/${caseId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  /**
   * Securely downloads an authenticated document file using blob stream
   */
  downloadDocumentFile: async (id: string, originalFileName: string): Promise<void> => {
    const res = await apiClient.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });

    const contentType = (res.headers['content-type'] as string) || 'application/octet-stream';
    const blob = new Blob([res.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalFileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },

  /**
   * Fetches an authenticated blob URL for inline PDF/Image preview
   */
  getPreviewBlobUrl: async (id: string): Promise<{ url: string; mimeType: string }> => {
    const res = await apiClient.get(`/documents/${id}/preview`, {
      responseType: 'blob',
    });
    const mimeType = (res.headers['content-type'] as string) || 'application/pdf';
    const blob = new Blob([res.data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    return { url, mimeType };
  },
};
