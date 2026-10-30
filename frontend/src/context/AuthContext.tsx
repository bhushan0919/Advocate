import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client.ts';

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  avatar?: string;
  designation?: string;
  officeAddress?: string;
  barCouncilNumber?: string;
  stateBarCouncil?: string;
  systemRole?: string;
  status?: string;
  createdAt?: string;
  lastLoginAt?: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    timezone?: string;
    dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat?: '12-hour' | '24-hour';
    language?: string;
  };
}

export interface Workspace {
  id: string;
  name: string;
  role: 'owner' | 'advocate' | 'clerk';
  permissions: string[];
}

export interface AuthContextType {
  user: User | null;
  workspace: Workspace | null;
  availableWorkspaces: Array<{ id: string; name: string; role: string }>;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string; workspaceId?: string }) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
  refreshUserData: () => Promise<void>;
  updateUserPreferences: (prefs: Partial<NonNullable<User['preferences']>>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    const token = localStorage.getItem('advd_access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiClient.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.data.user);
        setWorkspace(res.data.data.currentWorkspace);
        setAvailableWorkspaces(res.data.data.memberships);

        if (res.data.data.currentWorkspace?.id) {
          localStorage.setItem('advd_active_workspace_id', res.data.data.currentWorkspace.id);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      localStorage.removeItem('advd_access_token');
      localStorage.removeItem('advd_refresh_token');
      localStorage.removeItem('advd_active_workspace_id');
      setUser(null);
      setWorkspace(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (credentials: { email: string; password: string; workspaceId?: string }) => {
    const res = await apiClient.post('/auth/login', credentials);
    if (res.data.success) {
      const { user, workspace, availableWorkspaces, tokens } = res.data.data;
      localStorage.setItem('advd_access_token', tokens.accessToken);
      localStorage.setItem('advd_refresh_token', tokens.refreshToken);
      localStorage.setItem('advd_active_workspace_id', workspace.id);

      setUser(user);
      setWorkspace(workspace);
      setAvailableWorkspaces(availableWorkspaces);
    }
  };

  const register = async (payload: any) => {
    const res = await apiClient.post('/auth/register', payload);
    if (res.data.success) {
      const { user, workspace, tokens } = res.data.data;
      localStorage.setItem('advd_access_token', tokens.accessToken);
      localStorage.setItem('advd_refresh_token', tokens.refreshToken);
      localStorage.setItem('advd_active_workspace_id', workspace.id);

      setUser(user);
      setWorkspace(workspace);
      setAvailableWorkspaces([{ id: workspace.id, name: workspace.name, role: workspace.role }]);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('advd_refresh_token');
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (e) {
      // Continue client cleanup regardless
    } finally {
      localStorage.removeItem('advd_access_token');
      localStorage.removeItem('advd_refresh_token');
      localStorage.removeItem('advd_active_workspace_id');
      setUser(null);
      setWorkspace(null);
      setAvailableWorkspaces([]);
    }
  };

  const switchWorkspace = (workspaceId: string) => {
    localStorage.setItem('advd_active_workspace_id', workspaceId);
    window.location.reload();
  };

  const updateUserPreferences = (prefs: Partial<NonNullable<User['preferences']>>) => {
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          ...prefs,
        },
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspace,
        availableWorkspaces,
        isAuthenticated: !!user && !!workspace,
        isLoading,
        login,
        register,
        logout,
        switchWorkspace,
        refreshUserData: fetchProfile,
        updateUserPreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

