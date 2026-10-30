import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Client } from '../models/Client.js';
import { Case } from '../models/Case.js';
import { ActivityLog } from '../models/ActivityLog.js';

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const createClientSchema = z.object({
  body: z.object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    mobile: z
      .string({ required_error: 'Mobile number is required' })
      .trim()
      .regex(/^[0-9+\-\s()]{7,20}$/, 'Please provide a valid mobile number (7-20 digits)'),
    email: z
      .string()
      .trim()
      .email('Please provide a valid email')
      .or(z.literal(''))
      .optional(),
    address: z.string().trim().optional(),
    clientType: z.enum(['Individual', 'Corporate', 'Government', 'Other']).default('Individual'),
    notes: z.string().optional(),
  }),
});

export const updateClientSchema = z.object({
  body: z.object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters')
      .optional(),
    mobile: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]{7,20}$/, 'Please provide a valid mobile number (7-20 digits)')
      .optional(),
    email: z
      .string()
      .trim()
      .email('Please provide a valid email')
      .or(z.literal(''))
      .optional(),
    address: z.string().trim().optional(),
    clientType: z.enum(['Individual', 'Corporate', 'Government', 'Other']).optional(),
    notes: z.string().optional(),
    isArchived: z.boolean().optional(),
  }),
});

export const clientController = {
  // POST /api/clients
  createClient: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fullName, mobile, email, address, clientType, notes } = req.body;
      const workspaceId = req.workspaceId;

      const trimmedMobile = mobile.trim();
      const normalizedEmail = email ? email.trim().toLowerCase() : '';

      // Check duplicate mobile within workspace for active clients
      const existingMobile = await Client.findOne({
        workspaceId,
        mobile: trimmedMobile,
        isArchived: { $ne: true },
      });

      if (existingMobile) {
        res.status(409).json({
          success: false,
          field: 'mobile',
          message: `A client with mobile number "${trimmedMobile}" already exists in this workspace.`,
        });
        return;
      }

      // Check duplicate email within workspace for active clients (if email provided)
      if (normalizedEmail) {
        const existingEmail = await Client.findOne({
          workspaceId,
          email: normalizedEmail,
          isArchived: { $ne: true },
        });

        if (existingEmail) {
          res.status(409).json({
            success: false,
            field: 'email',
            message: `A client with email "${normalizedEmail}" already exists in this workspace.`,
          });
          return;
        }
      }

      const client = await Client.create({
        workspaceId,
        fullName: fullName.trim(),
        mobile: trimmedMobile,
        email: normalizedEmail,
        address: address ? address.trim() : '',
        clientType: clientType || 'Individual',
        notes: notes || '',
        isArchived: false,
      });

      await ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: 'CLIENT_CREATED',
        resourceType: 'Client',
        resourceId: client._id,
        details: { fullName: client.fullName, mobile: client.mobile, clientType: client.clientType },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Client created successfully.',
        data: client,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/clients
  getClients: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
      const skip = (page - 1) * limit;

      const filter: any = { workspaceId };

      if (req.query.includeArchived !== 'true') {
        filter.isArchived = { $ne: true };
      }

      if (req.query.clientType) {
        filter.clientType = req.query.clientType;
      }

      const search = (req.query.search || req.query.q) as string | undefined;
      if (search && search.trim()) {
        const escaped = escapeRegex(search.trim());
        filter.$or = [
          { fullName: { $regex: escaped, $options: 'i' } },
          { mobile: { $regex: escaped, $options: 'i' } },
          { email: { $regex: escaped, $options: 'i' } },
        ];
      }

      const [clients, total] = await Promise.all([
        Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Client.countDocuments(filter),
      ]);

      // Calculate associated case count for each client
      const clientIds = clients.map((c) => c._id);
      const caseCounts = await Case.aggregate([
        { $match: { workspaceId, clientId: { $in: clientIds } } },
        { $group: { _id: '$clientId', count: { $sum: 1 } } },
      ]);

      const caseCountMap = new Map(caseCounts.map((item) => [item._id.toString(), item.count]));

      const clientsWithCounts = clients.map((c) => {
        const obj = c.toObject();
        return {
          ...obj,
          caseCount: caseCountMap.get(c._id.toString()) || 0,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          clients: clientsWithCounts,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/clients/:id
  getClientById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid client ID format.',
        });
        return;
      }

      const client = await Client.findOne({ _id: id, workspaceId });
      if (!client) {
        res.status(404).json({
          success: false,
          message: 'Client not found in this workspace.',
        });
        return;
      }

      // Fetch all associated cases for this client within the same workspace
      const cases = await Case.find({ workspaceId, clientId: client._id })
        .populate('assignedClerkId', 'fullName email mobile')
        .sort({ nextHearingDate: 1, createdAt: -1 });

      res.status(200).json({
        success: true,
        data: {
          client,
          cases,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/clients/:id
  updateClient: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid client ID format.',
        });
        return;
      }

      const client = await Client.findOne({ _id: id, workspaceId });
      if (!client) {
        res.status(404).json({
          success: false,
          message: 'Client not found in this workspace.',
        });
        return;
      }

      const { fullName, mobile, email, address, clientType, notes, isArchived } = req.body;

      if (mobile && mobile.trim() !== client.mobile) {
        const trimmedMobile = mobile.trim();
        const existingMobile = await Client.findOne({
          _id: { $ne: client._id },
          workspaceId,
          mobile: trimmedMobile,
          isArchived: { $ne: true },
        });

        if (existingMobile) {
          res.status(409).json({
            success: false,
            field: 'mobile',
            message: `A client with mobile number "${trimmedMobile}" already exists in this workspace.`,
          });
          return;
        }
        client.mobile = trimmedMobile;
      }

      if (email !== undefined) {
        const normalizedEmail = email ? email.trim().toLowerCase() : '';
        if (normalizedEmail && normalizedEmail !== client.email) {
          const existingEmail = await Client.findOne({
            _id: { $ne: client._id },
            workspaceId,
            email: normalizedEmail,
            isArchived: { $ne: true },
          });

          if (existingEmail) {
            res.status(409).json({
              success: false,
              field: 'email',
              message: `A client with email "${normalizedEmail}" already exists in this workspace.`,
            });
            return;
          }
        }
        client.email = normalizedEmail;
      }

      if (fullName) {
        const trimmedName = fullName.trim();
        if (trimmedName !== client.fullName) {
          client.fullName = trimmedName;
          // Synchronize clientName snapshot on existing cases
          await Case.updateMany(
            { workspaceId, clientId: client._id },
            { $set: { clientName: trimmedName } }
          );
        }
      }

      if (address !== undefined) client.address = address.trim();
      if (clientType) client.clientType = clientType;
      if (notes !== undefined) client.notes = notes;
      if (typeof isArchived === 'boolean') client.isArchived = isArchived;

      await client.save();

      await ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: 'CLIENT_UPDATED',
        resourceType: 'Client',
        resourceId: client._id,
        details: { fullName: client.fullName },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Client updated successfully.',
        data: client,
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/clients/:id
  deleteClient: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid client ID format.',
        });
        return;
      }

      const client = await Client.findOne({ _id: id, workspaceId });
      if (!client) {
        res.status(404).json({
          success: false,
          message: 'Client not found in this workspace.',
        });
        return;
      }

      // Check if client is linked to any cases in this workspace
      const linkedCaseCount = await Case.countDocuments({
        workspaceId,
        clientId: client._id,
      });

      if (linkedCaseCount > 0) {
        // Do not permanently delete clients linked to cases; archive instead
        client.isArchived = true;
        await client.save();

        await ActivityLog.create({
          workspaceId,
          userId: req.user!._id,
          action: 'CLIENT_ARCHIVED',
          resourceType: 'Client',
          resourceId: client._id,
          details: {
            reason: 'Client has linked cases; archived to preserve case records',
            linkedCaseCount,
          },
          ipAddress: req.ip,
        });

        res.status(200).json({
          success: true,
          message: `Client has ${linkedCaseCount} linked court case(s) and has been safely archived to preserve case records.`,
          archived: true,
        });
        return;
      }

      // If no linked cases, permanently delete
      await Client.deleteOne({ _id: client._id, workspaceId });

      await ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: 'CLIENT_DELETED',
        resourceType: 'Client',
        resourceId: client._id,
        details: { fullName: client.fullName },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Client deleted successfully.',
        archived: false,
      });
    } catch (error) {
      next(error);
    }
  },
};

