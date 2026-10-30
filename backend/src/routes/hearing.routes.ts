import { Router } from 'express';
import {
  hearingController,
  correctHearingSchema,
} from '../controllers/hearing.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/tenant.middleware.js';
import { requirePermission, requireRole } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// All hearing routes require authentication and active workspace context
router.use(requireAuth, requireWorkspace);

// List all workspace hearing records with search, filter, and pagination
router.get('/', requirePermission('hearings:read'), hearingController.getWorkspaceHearings);

// Get single hearing details
router.get('/:id', requirePermission('hearings:read'), hearingController.getHearingById);

// Controlled audited correction (restricted to advocate / owner, clerks cannot alter history)
router.patch(
  '/:id/correct',
  requireRole('owner', 'advocate'),
  validate(correctHearingSchema),
  hearingController.correctHearing
);

export default router;

