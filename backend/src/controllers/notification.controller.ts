import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Notification } from '../models/Notification.js';

export const notificationController = {
  // GET /api/notifications
  getNotifications: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const userId = req.user!._id;
      const { isRead, type, category, page = '1', limit = '30' } = req.query;

      const filter: any = {
        workspaceId,
        userId,
      };

      // Read status filter
      if (isRead === 'true') {
        filter.isRead = true;
      } else if (isRead === 'false') {
        filter.isRead = false;
      }

      // Type filter
      if (type && typeof type === 'string' && type !== 'all') {
        filter.type = type;
      }

      // Category filter for UI tabs
      if (category && typeof category === 'string' && category !== 'all') {
        if (category === 'hearing') {
          filter.type = { $in: ['upcoming_hearing', 'hearing_rescheduled', 'hearing_cancelled'] };
        } else if (category === 'tasks') {
          filter.type = { $in: ['task_assigned', 'task_deadline_approaching', 'task_overdue'] };
        } else if (category === 'reminders') {
          filter.type = 'custom_reminder';
        } else if (category === 'other') {
          filter.type = { $in: ['clerk_invitation_accepted', 'workspace_activity'] };
        }
      }

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 30));
      const skip = (pageNum - 1) * limitNum;

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Notification.countDocuments(filter),
        Notification.countDocuments({ workspaceId, userId, isRead: false }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          notifications,
          unreadCount,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/notifications/unread-count
  getUnreadCount: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const userId = req.user!._id;

      const count = await Notification.countDocuments({
        workspaceId,
        userId,
        isRead: false,
      });

      res.status(200).json({
        success: true,
        data: {
          unreadCount: count,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/notifications/:id/read
  markAsRead: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;
      const userId = req.user!._id;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid notification ID format.' });
        return;
      }

      const notification = await Notification.findOneAndUpdate(
        { _id: id, workspaceId, userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        res.status(404).json({ success: false, message: 'Notification not found.' });
        return;
      }

      const unreadCount = await Notification.countDocuments({
        workspaceId,
        userId,
        isRead: false,
      });

      res.status(200).json({
        success: true,
        message: 'Notification marked as read.',
        data: {
          ...notification.toObject(),
          notification,
          unreadCount,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/notifications/mark-all-read
  markAllAsRead: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const userId = req.user!._id;

      const result = await Notification.updateMany(
        { workspaceId, userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read.',
        data: {
          modifiedCount: result.modifiedCount,
          unreadCount: 0,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/notifications/:id
  deleteNotification: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;
      const userId = req.user!._id;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid notification ID format.' });
        return;
      }

      const result = await Notification.deleteOne({ _id: id, workspaceId, userId });

      if (result.deletedCount === 0) {
        res.status(404).json({ success: false, message: 'Notification not found.' });
        return;
      }

      const unreadCount = await Notification.countDocuments({
        workspaceId,
        userId,
        isRead: false,
      });

      res.status(200).json({
        success: true,
        message: 'Notification dismissed.',
        data: { unreadCount },
      });
    } catch (error) {
      next(error);
    }
  },
};
