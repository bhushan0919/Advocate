import { Request, Response, NextFunction } from 'express';
import { Case } from '../models/Case.js';
import { Task } from '../models/Task.js';
import { Reminder } from '../models/Reminder.js';
import { Notification } from '../models/Notification.js';
import { formatDateOnly, getCalendarDayRange } from '../utils/date.js';

export const dashboardController = {
  // GET /api/dashboard/stats
  getDashboardData: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const userId = req.user!._id;
      const now = new Date();
      const todayStr = formatDateOnly(now);
      const todayDayRange = getCalendarDayRange(todayStr);

      // Execute queries in parallel
      const [
        totalCases,
        pendingCases,
        disposedCases,
        todayHearingsCases,
        upcomingHearingsCases,
        todayReminders,
        tasksDueToday,
        overdueTasks,
        myPendingTasks,
        recentNotifications,
        unreadNotificationsCount,
      ] = await Promise.all([
        // 1. Cases stats
        Case.countDocuments({ workspaceId, isArchived: { $ne: true } }),
        Case.countDocuments({ workspaceId, status: 'Pending', isArchived: { $ne: true } }),
        Case.countDocuments({ workspaceId, status: 'Disposed', isArchived: { $ne: true } }),

        // 2. Today's hearings
        Case.find({
          workspaceId,
          nextHearingDate: todayDayRange,
          isArchived: { $ne: true },
        })
          .populate('clientId', 'fullName mobile email')
          .sort({ courtName: 1, caseNumber: 1 })
          .limit(10),

        // 3. Upcoming hearings (next 14 days, excluding today)
        Case.find({
          workspaceId,
          nextHearingDate: { $gt: todayDayRange.$lte },
          isArchived: { $ne: true },
          status: { $ne: 'Disposed' },
        })
          .populate('clientId', 'fullName mobile email')
          .sort({ nextHearingDate: 1, courtName: 1 })
          .limit(8),

        // 4. Today's Reminders
        Reminder.find({
          workspaceId,
          reminderDate: todayDayRange,
          status: { $in: ['Pending', 'Snoozed'] },
        })
          .populate('assignedTo', 'fullName email')
          .populate('caseId', 'caseNumber courtName')
          .sort({ priority: -1, reminderDate: 1 })
          .limit(8),

        // 5. Tasks Due Today
        Task.find({
          workspaceId,
          dueDate: todayDayRange,
          status: { $in: ['Pending', 'To Do', 'In Progress'] },
        })
          .populate('assignedTo', 'fullName email')
          .populate('caseId', 'caseNumber')
          .sort({ priority: -1 })
          .limit(6),

        // 6. Overdue Tasks
        Task.find({
          workspaceId,
          dueDate: { $lt: todayDayRange.$gte },
          status: { $in: ['Pending', 'To Do', 'In Progress'] },
        })
          .populate('assignedTo', 'fullName email')
          .populate('caseId', 'caseNumber')
          .sort({ dueDate: 1, priority: -1 })
          .limit(6),

        // 7. My Pending Tasks
        Task.find({
          workspaceId,
          assignedTo: userId,
          status: { $in: ['Pending', 'To Do', 'In Progress'] },
        })
          .populate('caseId', 'caseNumber')
          .sort({ dueDate: 1, priority: -1 })
          .limit(6),

        // 8. Recent Notifications for User
        Notification.find({
          workspaceId,
          userId,
        })
          .sort({ createdAt: -1 })
          .limit(6),

        // 9. Unread notifications count
        Notification.countDocuments({
          workspaceId,
          userId,
          isRead: false,
        }),
      ]);

      // Calculate total upcoming hearings count
      const upcomingHearingsCount = await Case.countDocuments({
        workspaceId,
        nextHearingDate: { $gte: todayDayRange.$gte },
        isArchived: { $ne: true },
        status: { $ne: 'Disposed' },
      });

      // Calculate pending tasks count
      const pendingTasksCount = await Task.countDocuments({
        workspaceId,
        status: { $in: ['Pending', 'To Do', 'In Progress'] },
      });

      // Calculate total overdue tasks count
      const totalOverdueTasksCount = await Task.countDocuments({
        workspaceId,
        dueDate: { $lt: now },
        status: { $in: ['Pending', 'To Do', 'In Progress'] },
      });

      res.status(200).json({
        success: true,
        data: {
          todayDate: todayStr,
          stats: {
            totalCases,
            pendingCases,
            disposedCases,
            todayHearings: todayHearingsCases.length,
            upcomingHearings: upcomingHearingsCount,
            pendingTasks: pendingTasksCount,
            overdueTasks: totalOverdueTasksCount,
            todayReminders: todayReminders.length,
            unreadNotifications: unreadNotificationsCount,
          },
          metrics: {
            activeCases: totalCases,
            hearingsToday: todayHearingsCases.length,
            upcomingHearingsWeek: upcomingHearingsCount,
            tasksDueToday: tasksDueToday.length,
            overdueTasks: totalOverdueTasksCount,
            remindersToday: todayReminders.length,
            pendingTasksAssignedToMe: myPendingTasks.length,
            unreadNotifications: unreadNotificationsCount,
          },
          hearingsToday: todayHearingsCases,
          todayHearings: todayHearingsCases,
          upcomingHearings: upcomingHearingsCases,
          todayReminders,
          tasksDueToday,
          overdueTasks,
          myPendingTasks,
          recentNotifications,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
