import { Router } from 'express';
import {
  workspaceController,
  inviteMemberSchema,
  updateSettingsSchema,
} from '../controllers/workspace.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/tenant.middleware.js';
import { requireRole } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// All workspace routes require authentication and active workspace context
router.use(requireAuth, requireWorkspace);

// Current workspace details
router.get('/current', workspaceController.getCurrentWorkspace);
router.patch(
  '/settings',
  requireRole('owner'),
  validate(updateSettingsSchema),
  workspaceController.updateWorkspaceSettings
);

// Staff management
router.get('/members', workspaceController.getMembers);
router.post(
  '/invitations',
  requireRole('owner'),
  validate(inviteMemberSchema),
  workspaceController.inviteMember
);
router.get('/invitations', requireRole('owner'), workspaceController.listInvitations);
router.delete('/invitations/:id', requireRole('owner'), workspaceController.revokeInvitation);
router.patch(
  '/members/:memberId/status',
  requireRole('owner'),
  workspaceController.updateMemberStatus
);

export default router;

