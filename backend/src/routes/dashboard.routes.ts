import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/tenant.middleware.js';

const router = Router();

// All dashboard routes require authentication and active workspace context
router.use(requireAuth, requireWorkspace);

// GET /api/dashboard/stats
router.get('/stats', dashboardController.getDashboardData);

export default router;

