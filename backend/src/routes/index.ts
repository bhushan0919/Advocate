import { Router } from 'express';
import authRoutes from './auth.routes.js';
import workspaceRoutes from './workspace.routes.js';
import clientRoutes from './client.routes.js';
import caseRoutes from './case.routes.js';
import diaryRoutes from './diary.routes.js';
import hearingRoutes from './hearing.routes.js';
import calendarRoutes from './calendar.routes.js';
import taskRoutes from './task.routes.js';
import reminderRoutes from './reminder.routes.js';
import notificationRoutes from './notification.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import settingsRoutes from './settings.routes.js';
import documentRoutes from './document.routes.js';
import reportRoutes from './report.routes.js';

const router = Router();

// Health Check
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AdvD Multi-Tenant Legal Case Management API',
  });
});

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/clients', clientRoutes);
router.use('/cases', caseRoutes);
router.use('/diary', diaryRoutes);
router.use('/hearings', hearingRoutes);
router.use('/calendar', calendarRoutes);
router.use('/tasks', taskRoutes);
router.use('/reminders', reminderRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/documents', documentRoutes);
router.use('/reports', reportRoutes);

export default router;

