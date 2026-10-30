import { Router } from 'express';
import { taskController } from '../controllers/task.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/tenant.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

// All task routes require authentication and active workspace context
router.use(requireAuth, requireWorkspace);

// Task listing & summary
router.get('/', requirePermission('tasks:read'), taskController.getTasks);
router.get('/summary', requirePermission('tasks:read'), taskController.getTaskSummary);
router.get('/:id', requirePermission('tasks:read'), taskController.getTaskById);

// Task CRUD
router.post('/', requirePermission('tasks:write'), taskController.createTask);
router.patch('/:id', requirePermission('tasks:write'), taskController.updateTask);
router.delete('/:id', requirePermission('tasks:write'), taskController.deleteTask);

// Dedicated status, re-assign, and comment routes
router.patch('/:id/status', requirePermission('tasks:write'), taskController.updateTaskStatus);
router.patch('/:id/assign', requirePermission('tasks:write'), taskController.updateTask);
router.post('/:id/comments', requirePermission('tasks:write'), taskController.addTaskComment);

export default router;

