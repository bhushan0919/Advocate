export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  avatar: string;
  profilePicture?: string;
  designation: string;
  barCouncilNumber: string;
  stateBarCouncil: string;
  officeAddress: string;
  systemRole?: string;
  status?: string;
  roleInWorkspace?: 'owner' | 'advocate' | 'clerk';
  createdAt?: string;
  lastLoginAt?: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  mobile?: string;
  designation?: string;
  barCouncilNumber?: string;
  stateBarCouncil?: string;
  officeAddress?: string;
}

export interface AccountInfo {
  email: string;
  mobile: string;
  isEmailVerified: boolean;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface WorkspaceMemberItem {
  id: string;
  user: {
    _id?: string;
    id?: string;
    fullName: string;
    email: string;
    mobile?: string;
    designation?: string;
    avatar?: string;
  };
  role: 'owner' | 'advocate' | 'clerk';
  joinedAt: string;
}

export interface WorkspaceSettingsData {
  id: string;
  name: string;
  officeName: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  barCouncilNumber: string;
  stateBarCouncil: string;
  logo: string;
  settings: {
    reminderDaysBefore: number[];
    defaultCaseTypes?: string[];
  };
  owner: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
  };
  createdAt: string;
  userRole?: 'owner' | 'advocate' | 'clerk';
  membersCount: number;
  members: WorkspaceMemberItem[];
}

export interface UpdateWorkspacePayload {
  name?: string;
  officeName?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  barCouncilNumber?: string;
  stateBarCouncil?: string;
  reminderDaysBefore?: number[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12-hour' | '24-hour';
  language: string;
}

export interface SecurityActivityLog {
  _id: string;
  action: string;
  resourceType?: string;
  createdAt: string;
  ipAddress?: string;
  details?: Record<string, any>;
}

export interface SecurityInfo {
  lastLoginAt?: string;
  accountCreated: string;
  activeSessionsCount: number;
  recentLogs: SecurityActivityLog[];
}

export interface SessionItem {
  id: string;
  ipAddress: string;
  device: string;
  userAgent?: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface DataSummary {
  activeCases: number;
  archivedCases: number;
  totalCases: number;
  totalClients: number;
  totalHearings: number;
  totalTasks: number;
  totalReminders: number;
  totalMembers: number;
}

