import { Router } from 'express';
import { reminderController } from '../controllers/reminder.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/tenant.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

// All reminder routes require authentication and active workspace context
router.use(requireAuth, requireWorkspace);

// Reminder list & details
router.get('/', requirePermission('diary:read'), reminderController.getReminders);
router.get('/:id', requirePermission('diary:read'), reminderController.getReminderById);

// Create reminders (custom or automated hearing reminders)
router.post('/', requirePermission('diary:write'), reminderController.createReminder);
router.post(
  '/generate-hearing-reminders',
  requirePermission('diary:write'),
  reminderController.generateHearingReminders
);

// Manual trigger for testing/sync
router.post('/process-due', requirePermission('diary:write'), reminderController.processDueRemindersNow);

// Update, Snooze, Complete, Dismiss, Delete
router.patch('/:id', requirePermission('diary:write'), reminderController.updateReminder);
router.patch('/:id/complete', requirePermission('diary:write'), reminderController.completeReminder);
router.patch('/:id/dismiss', requirePermission('diary:write'), reminderController.dismissReminder);
router.patch('/:id/snooze', requirePermission('diary:write'), reminderController.snoozeReminder);
router.delete('/:id', requirePermission('diary:write'), reminderController.deleteReminder);

export default router;

