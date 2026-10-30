import { apiClient } from './client';
import {
  UserProfile,
  UpdateProfilePayload,
  AccountInfo,
  ChangePasswordPayload,
  WorkspaceSettingsData,
  UpdateWorkspacePayload,
  UserPreferences,
  SecurityInfo,
  SessionItem,
  DataSummary,
} from '../types/settings';

export const settingsApi = {
  // 1. Profile
  getProfile: async (): Promise<UserProfile> => {
    const res = await apiClient.get('/settings/profile');
    return res.data.data;
  },

  updateProfile: async (data: UpdateProfilePayload): Promise<UserProfile> => {
    const res = await apiClient.patch('/settings/profile', data);
    return res.data.data;
  },

  updateAvatar: async (
    avatarOrFormData: FormData | string
  ): Promise<{ avatar: string; profilePicture?: string; publicId?: string }> => {
    if (typeof avatarOrFormData === 'string') {
      const res = await apiClient.post('/settings/profile/avatar', { avatar: avatarOrFormData });
      return res.data.data;
    }
    const res = await apiClient.post('/settings/profile/avatar', avatarOrFormData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  deleteAvatar: async (): Promise<{ avatar: string }> => {
    const res = await apiClient.delete('/settings/profile/avatar');
    return res.data.data;
  },

  // 2. Account
  getAccount: async (): Promise<AccountInfo> => {
    const res = await apiClient.get('/settings/account');
    return res.data.data;
  },

  changePassword: async (data: ChangePasswordPayload): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.patch('/settings/account/password', data);
    return res.data;
  },

  updateMobile: async (mobile: string): Promise<{ mobile: string }> => {
    const res = await apiClient.patch('/settings/account/mobile', { mobile });
    return res.data.data;
  },

  deactivateAccount: async (currentPassword: string, confirmationText: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post('/settings/account/deactivate', { currentPassword, confirmationText });
    return res.data;
  },

  // 3. Workspace
  getWorkspaceSettings: async (): Promise<WorkspaceSettingsData> => {
    const res = await apiClient.get('/settings/workspace');
    return res.data.data;
  },

  updateWorkspaceSettings: async (data: UpdateWorkspacePayload): Promise<WorkspaceSettingsData> => {
    const res = await apiClient.patch('/settings/workspace', data);
    return res.data.data;
  },

  updateWorkspaceLogo: async (logo: string): Promise<{ logo: string }> => {
    const res = await apiClient.post('/settings/workspace/logo', { logo });
    return res.data.data;
  },

  deleteWorkspaceLogo: async (): Promise<{ logo: string }> => {
    const res = await apiClient.delete('/settings/workspace/logo');
    return res.data.data;
  },

  // 4. Preferences
  getPreferences: async (): Promise<UserPreferences> => {
    const res = await apiClient.get('/settings/preferences');
    return res.data.data;
  },

  updatePreferences: async (data: Partial<UserPreferences>): Promise<UserPreferences> => {
    const res = await apiClient.patch('/settings/preferences', data);
    return res.data.data;
  },

  // 5. Security
  getSecurityInfo: async (): Promise<SecurityInfo> => {
    const res = await apiClient.get('/settings/security');
    return res.data.data;
  },

  // 6. Sessions
  getSessions: async (): Promise<{ total: number; sessions: SessionItem[] }> => {
    const res = await apiClient.get('/settings/sessions');
    return res.data.data;
  },

  revokeSession: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/settings/sessions/${id}`);
    return res.data;
  },

  revokeOtherSessions: async (): Promise<{ revokedCount: number }> => {
    const res = await apiClient.post('/settings/sessions/revoke-others');
    return res.data.data;
  },

  // 7. Data & Privacy
  getDataSummary: async (): Promise<DataSummary> => {
    const res = await apiClient.get('/settings/data-summary');
    return res.data.data;
  },

  exportWorkspaceData: async (): Promise<any> => {
    const res = await apiClient.get('/settings/data-export');
    return res.data;
  },
};

