import { apiClient } from './client.ts';

export interface WorkspaceMember {
  membershipId: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    mobile?: string;
    barCouncilNumber?: string;
    status: string;
  };
  role: 'owner' | 'advocate' | 'clerk';
  permissions: string[];
  status: 'active' | 'suspended';
  joinedAt: string;
}

export const staffApi = {
  getMembers: async (): Promise<WorkspaceMember[]> => {
    const res = await apiClient.get('/workspaces/members');
    return res.data.data;
  },
};

