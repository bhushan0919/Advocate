import { Router } from 'express';
import {
  clientController,
  createClientSchema,
  updateClientSchema,
} from '../controllers/client.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/tenant.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// All client routes require authentication and tenant context
router.use(requireAuth, requireWorkspace);

// List clients (requires clients:read)
router.get('/', requirePermission('clients:read'), clientController.getClients);

// Get client by ID with associated cases (requires clients:read)
router.get('/:id', requirePermission('clients:read'), clientController.getClientById);

// Create client (requires clients:write - owners and advocates have '*', clerks restricted by default)
router.post(
  '/',
  requirePermission('clients:write'),
  validate(createClientSchema),
  clientController.createClient
);

// Update client (requires clients:write)
router.put(
  '/:id',
  requirePermission('clients:write'),
  validate(updateClientSchema),
  clientController.updateClient
);

// Delete/Archive client (requires clients:write)
router.delete('/:id', requirePermission('clients:write'), clientController.deleteClient);

export default router;

