import { TaskRecord } from './task';
import { ReminderRecord } from './reminder';
import { NotificationRecord } from './notification';

export interface DashboardStats {
  metrics: {
    activeCases: number;
    hearingsToday: number;
    upcomingHearingsWeek: number;
    tasksDueToday: number;
    overdueTasks: number;
    remindersToday: number;
    pendingTasksAssignedToMe: number;
    unreadNotifications: number;
  };
  hearingsToday: Array<{
    _id: string;
    caseNumber: string;
    courtName: string;
    courtRoomNumber?: string;
    clientName: string;
    opponentName: string;
    nextHearingPurpose?: string;
    status: string;
  }>;
  upcomingHearings: Array<{
    _id: string;
    caseNumber: string;
    courtName: string;
    courtRoomNumber?: string;
    clientName: string;
    opponentName: string;
    nextHearingDate: string;
    nextHearingPurpose?: string;
    status: string;
  }>;
  todayReminders: ReminderRecord[];
  tasksDueToday: TaskRecord[];
  overdueTasks: TaskRecord[];
  myPendingTasks: TaskRecord[];
  recentNotifications: NotificationRecord[];
}

