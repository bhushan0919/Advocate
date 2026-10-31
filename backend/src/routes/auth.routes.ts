import { Router } from 'express';
import {
  authController,
  registerAdvocateSchema,
  loginSchema,
  acceptInvitationSchema,
} from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

// Public Auth Endpoints with Brute-Force & Credential Stuffing Rate Limiting
router.post('/register', authLimiter, validate(registerAdvocateSchema), authController.registerAdvocate);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/verify-invitation', authController.verifyInvitation);
router.post('/accept-invitation', authLimiter, validate(acceptInvitationSchema), authController.acceptInvitation);

// Protected Auth Endpoints
router.get('/me', requireAuth, authController.getMe);

export default router;
