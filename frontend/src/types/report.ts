export interface OverviewReportData {
  cases: {
    total: number;
    active: number;
    disposed: number;
    statusBreakdown: Array<{ status: string; count: number }>;
  };
  hearings: {
    total: number;
    upcomingNext30Days: number;
    monthlyTrends: Array<{ label: string; count: number }>;
  };
  tasks: {
    total: number;
    pending: number;
    overdue: number;
    completed: number;
    completionRate: number;
  };
  clients: {
    total: number;
  };
  staff: {
    totalMembers: number;
  };
}

export interface CasesReportData {
  summary: {
    totalCases: number;
    activeCases: number;
    disposedCases: number;
  };
  casesByCourt: Array<{ court: string; count: number }>;
  casesByCaseType: Array<{ caseType: string; count: number }>;
  casesByStatus: Array<{ status: string; count: number }>;
  recentCases: any[];
}

export interface HearingsReportData {
  summary: {
    totalHearings: number;
    conductedHearings: number;
    upcomingHearings: number;
    casesMissingNextDateCount: number;
  };
  hearingsByCourt: Array<{ court: string; count: number }>;
  monthlyTrends: Array<{ label: string; count: number }>;
  casesWithNoNextDate: any[];
}

export interface DiaryReportData {
  totalScheduled: number;
  cases: any[];
}

export interface TasksReportData {
  summary: {
    totalTasks: number;
    pendingTasks: number;
    completedTasks: number;
    overdueTasks: number;
    completionRate: number;
  };
  tasksByPriority: Array<{ priority: string; count: number }>;
  staffWorkload: Array<{
    userId: string;
    userName: string;
    email: string;
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    rate: number;
  }>;
}

export interface ClientsReportData {
  summary: {
    totalClients: number;
    individualClients: number;
    corporateClients: number;
    governmentClients: number;
    clientsWithMultipleCases: number;
  };
  topClients: Array<{
    id: string;
    fullName: string;
    mobile: string;
    email: string;
    clientType: string;
    totalCases: number;
    activeCases: number;
    disposedCases: number;
  }>;
}

export interface StaffReportData {
  members: Array<{
    id: string;
    userId: string;
    fullName: string;
    email: string;
    mobile: string;
    designation: string;
    avatar: string;
    role: string;
    joinedAt: string;
    assignedCases: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    completionRate: number;
  }>;
}

export interface ReportFilterParams {
  startDate?: string;
  endDate?: string;
  court?: string;
  caseType?: string;
  status?: string;
  assignedTo?: string;
  date?: string;
  lang?: string;
}

