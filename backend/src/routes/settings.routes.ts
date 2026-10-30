import { Router, Request, Response, NextFunction } from 'express';
import { settingsController } from '../controllers/settings.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/tenant.middleware.js';
import { uploadAvatarMiddleware } from '../middleware/avatar-upload.middleware.js';

const router = Router();

// Middleware to parse multipart avatar uploads if content-type is multipart/form-data
const handleAvatarUpload = (req: Request, res: Response, next: NextFunction) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    uploadAvatarMiddleware.single('avatar')(req, res, (err) => {
      if (err) {
        uploadAvatarMiddleware.single('file')(req, res, (err2) => {
          if (err2) {
            res.status(400).json({ success: false, message: err.message || err2.message });
            return;
          }
          next();
        });
        return;
      }
      next();
    });
  } else {
    next();
  }
};

// All settings routes require authentication and active workspace context
router.use(requireAuth, requireWorkspace);

// 1. My Profile
router.get('/profile', settingsController.getProfile);
router.patch('/profile', settingsController.updateProfile);
router.post('/profile/avatar', handleAvatarUpload, settingsController.updateAvatar);
router.delete('/profile/avatar', settingsController.deleteAvatar);

// 2. Account Settings
router.get('/account', settingsController.getAccount);
router.patch('/account/password', settingsController.changePassword);
router.patch('/account/mobile', settingsController.updateMobile);
router.post('/account/deactivate', settingsController.deactivateAccount);

// 3. Workspace Settings (Advocate / Owner only enforced inside controller)
router.get('/workspace', settingsController.getWorkspaceSettings);
router.patch('/workspace', settingsController.updateWorkspaceSettings);
router.post('/workspace/logo', settingsController.updateWorkspaceLogo);
router.delete('/workspace/logo', settingsController.deleteWorkspaceLogo);

// 4. Regional & Appearance Preferences
router.get('/preferences', settingsController.getPreferences);
router.patch('/preferences', settingsController.updatePreferences);

// 5. Security & Audit Logs
router.get('/security', settingsController.getSecurityInfo);

// 6. Active Session Management
router.get('/sessions', settingsController.getSessions);
router.delete('/sessions/:id', settingsController.revokeSession);
router.post('/sessions/revoke-others', settingsController.revokeOtherSessions);

// 7. Data & Privacy
router.get('/data-summary', settingsController.getDataSummary);
router.get('/data-export', settingsController.exportWorkspaceData);

export default router;

