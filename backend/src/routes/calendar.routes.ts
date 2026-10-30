import { Router } from 'express';
import { calendarController } from '../controllers/calendar.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/tenant.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

// All calendar routes require authentication and active workspace context
router.use(requireAuth, requireWorkspace);

// GET /api/calendar - Upcoming calendar events in range
router.get('/', requirePermission('diary:read'), calendarController.getCalendarEvents);

// GET /api/calendar/summary - Summary metrics for calendar range
router.get('/summary', requirePermission('diary:read'), calendarController.getCalendarSummary);

// GET /api/calendar/date/:date - Specific date hearing details
router.get('/date/:date', requirePermission('diary:read'), calendarController.getCalendarDateDetails);

export default router;

