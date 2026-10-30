import { Types } from 'mongoose';
import { Notification, NotificationType, NotificationPriority } from '../models/Notification.js';
import { Reminder } from '../models/Reminder.js';
import { Task } from '../models/Task.js';
import { WorkspaceMembership } from '../models/WorkspaceMembership.js';

export interface CreateNotificationParams {
  workspaceId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  caseId?: Types.ObjectId | string;
  hearingId?: Types.ObjectId | string;
  taskId?: Types.ObjectId | string;
  reminderId?: Types.ObjectId | string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export const notificationService = {
  /**
   * Creates a notification with deduplication checks
   */
  createNotification: async (params: CreateNotificationParams) => {
    try {
      // Deduplication check for reminders
      if (params.reminderId) {
        const existing = await Notification.findOne({
          workspaceId: params.workspaceId,
          userId: params.userId,
          reminderId: params.reminderId,
        });
        if (existing) {
          return existing;
        }
      }

      // Deduplication check for specific task assignments within 1 minute
      if (params.taskId && params.type === 'task_assigned') {
        const existing = await Notification.findOne({
          workspaceId: params.workspaceId,
          userId: params.userId,
          taskId: params.taskId,
          type: 'task_assigned',
        });
        if (existing) {
          return existing;
        }
      }

      const notif = await Notification.create({
        workspaceId: params.workspaceId,
        userId: params.userId,
        type: params.type,
        title: params.title.trim(),
        message: params.message.trim(),
        priority: params.priority || 'Medium',
        caseId: params.caseId,
        hearingId: params.hearingId,
        taskId: params.taskId,
        reminderId: params.reminderId,
        actionUrl: params.actionUrl || '',
        metadata: params.metadata || {},
        isRead: false,
      });

      return notif;
    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error);
      throw error;
    }
  },

  /**
   * Broadcasts a notification to all active workspace users or a specific role
   */
  notifyWorkspaceUsers: async (
    workspaceId: Types.ObjectId | string,
    params: Omit<CreateNotificationParams, 'workspaceId' | 'userId'>,
    filterRoles?: string[]
  ) => {
    try {
      const membershipQuery: any = {
        workspaceId,
        status: 'active',
      };
      if (filterRoles && filterRoles.length > 0) {
        membershipQuery.role = { $in: filterRoles };
      }

      const memberships = await WorkspaceMembership.find(membershipQuery).select('userId');
      const notifications = [];

      for (const m of memberships) {
        const n = await notificationService.createNotification({
          ...params,
          workspaceId,
          userId: m.userId,
        });
        notifications.push(n);
      }

      return notifications;
    } catch (error) {
      console.error('[NotificationService] Error broadcasting notification:', error);
      throw error;
    }
  },

  /**
   * Background processor: Scans database for pending reminders whose reminderDate has arrived
   * and creates in-app notifications atomically.
   */
  processDueReminders: async (): Promise<number> => {
    try {
      const now = new Date();

      // Find all pending, unnotified reminders that are due
      const dueReminders = await Reminder.find({
        status: 'Pending',
        isNotified: false,
        reminderDate: { $lte: now },
      });

      if (dueReminders.length === 0) {
        return 0;
      }

      let processedCount = 0;

      for (const reminder of dueReminders) {
        // Build action URL
        let actionUrl = '/reminders';
        if (reminder.caseId) {
          actionUrl = `/cases/${reminder.caseId.toString()}`;
        } else if (reminder.reminderType === 'hearing') {
          actionUrl = '/diary';
        }

        // Create notification for assigned user
        await notificationService.createNotification({
          workspaceId: reminder.workspaceId,
          userId: reminder.assignedTo,
          type: reminder.reminderType === 'hearing' ? 'upcoming_hearing' : 'custom_reminder',
          title: `Reminder: ${reminder.title}`,
          message:
            reminder.description ||
            (reminder.caseNumber
              ? `Hearing scheduled for case ${reminder.caseNumber} in ${reminder.courtName || 'Court'}.`
              : `Reminder due for ${reminder.title}.`),
          priority: reminder.priority,
          caseId: reminder.caseId,
          hearingId: reminder.hearingId,
          reminderId: reminder._id,
          actionUrl,
          metadata: {
            caseNumber: reminder.caseNumber,
            courtName: reminder.courtName,
            hearingPurpose: reminder.hearingPurpose,
            reminderDate: reminder.reminderDate,
          },
        });

        // Mark reminder as notified
        reminder.isNotified = true;
        reminder.notifiedAt = now;
        await reminder.save();

        processedCount++;
      }

      return processedCount;
    } catch (error) {
      console.error('[NotificationService] Error processing due reminders:', error);
      return 0;
    }
  },

  /**
   * Background processor: Scans overdue tasks and notifies assigned users
   */
  checkOverdueTasks: async (): Promise<number> => {
    try {
      const now = new Date();

      const overdueTasks = await Task.find({
        status: { $in: ['Pending', 'To Do', 'In Progress'] },
        dueDate: { $lt: now },
      });

      let notifiedCount = 0;

      for (const task of overdueTasks) {
        // Check if an overdue notification was already generated today for this task
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existing = await Notification.findOne({
          workspaceId: task.workspaceId,
          userId: task.assignedTo,
          taskId: task._id,
          type: 'task_overdue',
          createdAt: { $gte: twentyFourHoursAgo },
        });

        if (!existing) {
          await notificationService.createNotification({
            workspaceId: task.workspaceId,
            userId: task.assignedTo,
            type: 'task_overdue',
            title: `Task Overdue: ${task.title}`,
            message: `Task "${task.title}" was due on ${task.dueDate.toLocaleDateString('en-IN')}. Please update progress or complete it.`,
            priority: 'Urgent',
            taskId: task._id,
            caseId: task.caseId,
            actionUrl: '/tasks',
            metadata: {
              dueDate: task.dueDate,
              taskPriority: task.priority,
            },
          });
          notifiedCount++;
        }
      }

      return notifiedCount;
    } catch (error) {
      console.error('[NotificationService] Error checking overdue tasks:', error);
      return 0;
    }
  },
};

