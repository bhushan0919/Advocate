import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/tenant.middleware.js';

const router = Router();

// All notification routes require authentication and active workspace context
router.use(requireAuth, requireWorkspace);

// Notification retrieval & unread count
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);

// Read state mutations
router.patch('/mark-all-read', notificationController.markAllAsRead);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

export default router;
