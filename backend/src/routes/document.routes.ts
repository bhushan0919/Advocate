import { Router } from 'express';
import { documentController } from '../controllers/document.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/tenant.middleware.js';
import { requireRole } from '../middleware/permission.middleware.js';
import { uploadDocumentMiddleware } from '../middleware/upload.middleware.js';

const router = Router();

// All document routes require authentication and workspace context
router.use(requireAuth, requireWorkspace);

// Document Listing, Searching & Filtering
router.get('/', documentController.getDocuments);

// Document Upload
router.post('/', uploadDocumentMiddleware.single('file'), documentController.createDocument);

// Single Document Details
router.get('/:id', documentController.getDocumentById);

// Update Document Metadata
router.patch('/:id', documentController.updateDocument);

// Delete Document (Advocate/Owner Only: Enforced at both route and controller levels)
router.delete('/:id', requireRole('owner', 'advocate'), documentController.deleteDocument);

// Authenticated Download Endpoint (Guarded by workspace tenant check)
router.get('/:id/download', documentController.downloadDocument);

// Authenticated Preview Endpoint (Inline for PDF/Images)
router.get('/:id/preview', documentController.previewDocument);

export default router;
