import { Router } from 'express';
import { diaryController } from '../controllers/diary.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/tenant.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

// All diary routes require authentication and active workspace context
router.use(requireAuth, requireWorkspace);

// Daily Court Diary for selected date (YYYY-MM-DD)
router.get('/', requirePermission('diary:read'), diaryController.getDailyDiary);

// Daily Court Diary summary statistics
router.get('/summary', requirePermission('diary:read'), diaryController.getDiarySummary);

export default router;

