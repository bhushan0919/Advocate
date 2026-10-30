import { Router } from 'express';
import {
  caseController,
  createCaseSchema,
  updateCaseSchema,
} from '../controllers/case.controller.js';
import {
  hearingController,
  createHearingSchema,
} from '../controllers/hearing.controller.js';
import { documentController } from '../controllers/document.controller.js';
import { uploadDocumentMiddleware } from '../middleware/upload.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/tenant.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// All case routes require authentication and active workspace context
router.use(requireAuth, requireWorkspace);

// List cases with search, filter, pagination, and sorting
router.get('/', requirePermission('cases:read'), caseController.getCases);

// Get single case by ID with full details
router.get('/:id', requirePermission('cases:read'), caseController.getCaseById);

// Create new case (advocates and clerks with cases:write)
router.post(
  '/',
  requirePermission('cases:write'),
  validate(createCaseSchema),
  caseController.createCase
);

// Update case
router.put(
  '/:id',
  requirePermission('cases:write'),
  validate(updateCaseSchema),
  caseController.updateCase
);

// Archive or restore case
router.patch(
  '/:id/archive',
  requirePermission('cases:write'),
  caseController.archiveCase
);

// Hearing management for specific case
router.post(
  '/:id/hearings',
  requirePermission('hearings:write'),
  validate(createHearingSchema),
  hearingController.createCaseHearing
);

router.get(
  '/:id/hearings',
  requirePermission('hearings:read'),
  hearingController.getCaseHearings
);

// Document management for specific case
router.get(
  '/:id/documents',
  requirePermission('cases:read'),
  (req, res, next) => {
    req.params.caseId = req.params.id;
    next();
  },
  documentController.getCaseDocuments
);

router.post(
  '/:id/documents',
  requirePermission('cases:write'),
  uploadDocumentMiddleware.single('file'),
  (req, res, next) => {
    req.body.caseId = req.params.id;
    next();
  },
  documentController.createDocument
);

export default router;

