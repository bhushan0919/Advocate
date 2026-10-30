export type NotificationType =
  | 'upcoming_hearing'
  | 'hearing_rescheduled'
  | 'hearing_cancelled'
  | 'task_assigned'
  | 'task_deadline'
  | 'task_overdue'
  | 'invitation_accepted'
  | 'workspace_activity'
  | 'reminder_alert';

export type NotificationPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface NotificationRecord {
  _id: string;
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  link?: string;
  priority: NotificationPriority;
  caseId?: string;
  hearingId?: string;
  taskId?: string;
  reminderId?: string;
  createdAt: string;
  updatedAt: string;
}

