import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Case } from '../models/Case.js';
import { Client } from '../models/Client.js';
import { Reminder } from '../models/Reminder.js';
import { WorkspaceMembership } from '../models/WorkspaceMembership.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { notificationService } from '../services/notification.service.js';

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const optionalDateSchema = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((val) => {
    if (!val || val === '') return undefined;
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  });

export const createCaseSchema = z.object({
  body: z.object({
    caseNumber: z
      .string({ required_error: 'Case number is required' })
      .trim()
      .min(1, 'Case number is required')
      .max(100, 'Case number cannot exceed 100 characters'),
    cnrNumber: z.string().trim().optional(),
    caseType: z
      .enum(['Civil', 'Criminal', 'Family', 'Property', 'Consumer', 'Labour', 'Other'])
      .default('Civil'),
    courtName: z
      .string({ required_error: 'Court name is required' })
      .trim()
      .min(2, 'Court name is required')
      .max(150, 'Court name cannot exceed 150 characters'),
    courtLocation: z.string().trim().optional(),
    courtRoomNumber: z.string().trim().optional(),
    clientId: z.string({ required_error: 'Client ID is required' }),
    opponentName: z
      .string({ required_error: 'Opponent name is required' })
      .trim()
      .min(1, 'Opponent name is required')
      .max(120, 'Opponent name cannot exceed 120 characters'),
    opponentAdvocate: z.string().trim().optional(),
    filingDate: optionalDateSchema,
    previousHearingDate: optionalDateSchema,
    nextHearingDate: optionalDateSchema,
    nextHearingPurpose: z.string().trim().optional(),
    status: z
      .enum(['Pending', 'Disposed', 'Transferred', 'Withdrawn', 'Stayed'])
      .default('Pending'),
    assignedClerkId: z.string().optional().nullable(),
    caseDescription: z.string().optional(),
  }),
});

export const updateCaseSchema = z.object({
  body: z.object({
    caseNumber: z
      .string()
      .trim()
      .min(1, 'Case number cannot be empty')
      .max(100, 'Case number cannot exceed 100 characters')
      .optional(),
    cnrNumber: z.string().trim().optional(),
    caseType: z
      .enum(['Civil', 'Criminal', 'Family', 'Property', 'Consumer', 'Labour', 'Other'])
      .optional(),
    courtName: z
      .string()
      .trim()
      .min(2, 'Court name is required')
      .max(150, 'Court name cannot exceed 150 characters')
      .optional(),
    courtLocation: z.string().trim().optional(),
    courtRoomNumber: z.string().trim().optional(),
    clientId: z.string().optional(),
    opponentName: z
      .string()
      .trim()
      .min(1, 'Opponent name cannot be empty')
      .max(120, 'Opponent name cannot exceed 120 characters')
      .optional(),
    opponentAdvocate: z.string().trim().optional(),
    filingDate: optionalDateSchema,
    previousHearingDate: optionalDateSchema,
    nextHearingDate: optionalDateSchema,
    nextHearingPurpose: z.string().trim().optional(),
    status: z
      .enum(['Pending', 'Disposed', 'Transferred', 'Withdrawn', 'Stayed'])
      .optional(),
    assignedClerkId: z.string().optional().nullable(),
    caseDescription: z.string().optional(),
    isArchived: z.boolean().optional(),
  }),
});

export const caseController = {
  // POST /api/cases
  createCase: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const {
        caseNumber,
        cnrNumber,
        caseType,
        courtName,
        courtLocation,
        courtRoomNumber,
        clientId,
        opponentName,
        opponentAdvocate,
        filingDate,
        previousHearingDate,
        nextHearingDate,
        nextHearingPurpose,
        status,
        assignedClerkId,
        caseDescription,
      } = req.body;

      // 1. Validate Client ObjectId & Multi-tenant boundary
      if (!mongoose.Types.ObjectId.isValid(clientId)) {
        res.status(400).json({
          success: false,
          field: 'clientId',
          message: 'Invalid Client ID format.',
        });
        return;
      }

      const client = await Client.findOne({ _id: clientId, workspaceId });
      if (!client) {
        res.status(400).json({
          success: false,
          field: 'clientId',
          message: 'Referenced client does not exist or does not belong to this workspace.',
        });
        return;
      }

      // 2. Validate Assigned Clerk (if provided)
      let resolvedClerkId: mongoose.Types.ObjectId | undefined = undefined;
      if (assignedClerkId && assignedClerkId.trim() !== '') {
        if (!mongoose.Types.ObjectId.isValid(assignedClerkId)) {
          res.status(400).json({
            success: false,
            field: 'assignedClerkId',
            message: 'Invalid Clerk ID format.',
          });
          return;
        }

        const clerkMembership = await WorkspaceMembership.findOne({
          workspaceId,
          userId: assignedClerkId,
          status: 'active',
        });

        if (!clerkMembership) {
          res.status(400).json({
            success: false,
            field: 'assignedClerkId',
            message: 'Assigned clerk is not an active member of this workspace.',
          });
          return;
        }
        resolvedClerkId = new mongoose.Types.ObjectId(assignedClerkId);
      }

      // 3. Prevent duplicate case numbers within the workspace scope
      const trimmedCaseNumber = caseNumber.trim();
      const duplicateCase = await Case.findOne({
        workspaceId,
        caseNumber: { $regex: new RegExp(`^${escapeRegex(trimmedCaseNumber)}$`, 'i') },
      });

      if (duplicateCase) {
        res.status(409).json({
          success: false,
          field: 'caseNumber',
          message: `Case number "${trimmedCaseNumber}" already exists in this workspace.`,
        });
        return;
      }

      // 4. Create the Case with Client Name Snapshot
      const newCase = await Case.create({
        workspaceId,
        caseNumber: trimmedCaseNumber,
        cnrNumber: cnrNumber ? cnrNumber.trim().toUpperCase() : '',
        caseType: caseType || 'Civil',
        courtName: courtName.trim(),
        courtLocation: courtLocation ? courtLocation.trim() : '',
        courtRoomNumber: courtRoomNumber ? courtRoomNumber.trim() : '',
        clientId: client._id,
        clientName: client.fullName,
        opponentName: opponentName.trim(),
        opponentAdvocate: opponentAdvocate ? opponentAdvocate.trim() : '',
        filingDate: filingDate || undefined,
        previousHearingDate: previousHearingDate || undefined,
        nextHearingDate: nextHearingDate || undefined,
        nextHearingPurpose: nextHearingPurpose ? nextHearingPurpose.trim() : '',
        status: status || 'Pending',
        assignedClerkId: resolvedClerkId,
        caseDescription: caseDescription || '',
        isArchived: false,
      });

      // 5. Populate and log activity
      const populatedCase = await Case.findById(newCase._id)
        .populate('clientId', 'fullName mobile email clientType')
        .populate('assignedClerkId', 'fullName email mobile');

      await ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: 'CASE_CREATED',
        resourceType: 'Case',
        resourceId: newCase._id,
        details: {
          caseNumber: newCase.caseNumber,
          courtName: newCase.courtName,
          clientName: client.fullName,
        },
        ipAddress: req.ip,
      });

      // Auto-schedule hearing reminder if nextHearingDate is specified
      if (newCase.nextHearingDate) {
        try {
          const oneDayBefore = new Date(newCase.nextHearingDate);
          oneDayBefore.setDate(oneDayBefore.getDate() - 1);
          oneDayBefore.setHours(9, 0, 0, 0);

          await Reminder.create({
            workspaceId,
            caseId: newCase._id,
            title: `Hearing scheduled: ${newCase.caseNumber}`,
            description: `Hearing scheduled in ${newCase.courtName} (${newCase.courtRoomNumber || 'Court'}). Purpose: ${newCase.nextHearingPurpose || 'Hearing'}`,
            reminderType: 'hearing',
            intervalType: '1_day_before',
            hearingDate: newCase.nextHearingDate,
            reminderDate: oneDayBefore,
            priority: 'High',
            assignedTo: newCase.assignedClerkId || req.user!._id,
            status: 'Pending',
            isNotified: false,
            caseNumber: newCase.caseNumber,
            clientName: client.fullName,
            courtName: newCase.courtName,
            hearingPurpose: newCase.nextHearingPurpose || 'Hearing',
            createdBy: req.user!._id,
          });
        } catch (remErr) {
          console.error('[CaseController] Failed to auto-generate initial hearing reminder:', remErr);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Case registered successfully.',
        data: populatedCase,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/cases
  getCases: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
      const skip = (page - 1) * limit;

      const filter: any = { workspaceId };

      // Archive filter: default only active, unless specified
      if (req.query.isArchived === 'true') {
        filter.isArchived = true;
      } else if (req.query.isArchived === 'all') {
        // include both
      } else {
        filter.isArchived = { $ne: true };
      }

      // Filter by Court
      if (req.query.court && typeof req.query.court === 'string' && req.query.court.trim()) {
        filter.courtName = { $regex: escapeRegex(req.query.court.trim()), $options: 'i' };
      }

      // Filter by Case Type
      if (req.query.caseType && typeof req.query.caseType === 'string' && req.query.caseType.trim()) {
        filter.caseType = req.query.caseType.trim();
      }

      // Filter by Status
      if (req.query.status && typeof req.query.status === 'string' && req.query.status.trim()) {
        filter.status = req.query.status.trim();
      }

      // Specific Search by Case Number
      if (req.query.caseNumber && typeof req.query.caseNumber === 'string' && req.query.caseNumber.trim()) {
        filter.caseNumber = { $regex: escapeRegex(req.query.caseNumber.trim()), $options: 'i' };
      }

      // Specific Search by CNR
      if (req.query.cnrNumber && typeof req.query.cnrNumber === 'string' && req.query.cnrNumber.trim()) {
        filter.cnrNumber = { $regex: escapeRegex(req.query.cnrNumber.trim()), $options: 'i' };
      }

      // Specific Search by Opponent
      if (req.query.opponent && typeof req.query.opponent === 'string' && req.query.opponent.trim()) {
        filter.opponentName = { $regex: escapeRegex(req.query.opponent.trim()), $options: 'i' };
      }

      // Specific Search by Client
      if (req.query.client && typeof req.query.client === 'string' && req.query.client.trim()) {
        const clientQuery = req.query.client.trim();
        if (mongoose.Types.ObjectId.isValid(clientQuery)) {
          filter.clientId = new mongoose.Types.ObjectId(clientQuery);
        } else {
          filter.clientName = { $regex: escapeRegex(clientQuery), $options: 'i' };
        }
      }

      // Filter by Hearing Date
      if (req.query.hearingDate && typeof req.query.hearingDate === 'string') {
        const targetDate = new Date(req.query.hearingDate);
        if (!isNaN(targetDate.getTime())) {
          const startOfDay = new Date(targetDate);
          startOfDay.setUTCHours(0, 0, 0, 0);
          const endOfDay = new Date(targetDate);
          endOfDay.setUTCHours(23, 59, 59, 999);
          filter.nextHearingDate = { $gte: startOfDay, $lte: endOfDay };
        }
      } else if (req.query.startDate || req.query.endDate) {
        filter.nextHearingDate = {};
        if (req.query.startDate) {
          const sDate = new Date(req.query.startDate as string);
          if (!isNaN(sDate.getTime())) filter.nextHearingDate.$gte = sDate;
        }
        if (req.query.endDate) {
          const eDate = new Date(req.query.endDate as string);
          if (!isNaN(eDate.getTime())) filter.nextHearingDate.$lte = eDate;
        }
      }

      // Generic Search Bar (q / search) across caseNumber, cnrNumber, clientName, opponentName, courtName
      const generalSearch = (req.query.search || req.query.q) as string | undefined;
      if (generalSearch && generalSearch.trim()) {
        const escaped = escapeRegex(generalSearch.trim());
        const searchOr: any[] = [
          { caseNumber: { $regex: escaped, $options: 'i' } },
          { cnrNumber: { $regex: escaped, $options: 'i' } },
          { clientName: { $regex: escaped, $options: 'i' } },
          { opponentName: { $regex: escaped, $options: 'i' } },
          { courtName: { $regex: escaped, $options: 'i' } },
        ];
        if (filter.$or) {
          filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
          delete filter.$or;
        } else {
          filter.$or = searchOr;
        }
      }

      // Sorting: default by nextHearingDate ascending (nulls last)
      const sortBy = (req.query.sortBy as string) || 'nextHearingDate';
      const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

      let sortOptions: any = {};
      if (sortBy === 'nextHearingDate') {
        // If sorting by hearing date, sort by nextHearingDate, secondary by createdAt
        sortOptions = { nextHearingDate: sortOrder, createdAt: -1 };
      } else {
        sortOptions = { [sortBy]: sortOrder };
      }

      const [cases, total] = await Promise.all([
        Case.find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .populate('clientId', 'fullName mobile email clientType')
          .populate('assignedClerkId', 'fullName email mobile'),
        Case.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: {
          cases,
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

  // GET /api/cases/:id
  getCaseById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid case ID format.',
        });
        return;
      }

      const caseRecord = await Case.findOne({ _id: id, workspaceId })
        .populate('clientId')
        .populate('assignedClerkId', 'fullName email mobile');

      if (!caseRecord) {
        res.status(404).json({
          success: false,
          message: 'Case not found in this workspace.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: caseRecord,
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/cases/:id
  updateCase: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid case ID format.',
        });
        return;
      }

      const caseRecord = await Case.findOne({ _id: id, workspaceId });
      if (!caseRecord) {
        res.status(404).json({
          success: false,
          message: 'Case not found in this workspace.',
        });
        return;
      }

      const {
        caseNumber,
        cnrNumber,
        caseType,
        courtName,
        courtLocation,
        courtRoomNumber,
        clientId,
        opponentName,
        opponentAdvocate,
        filingDate,
        previousHearingDate,
        nextHearingDate,
        nextHearingPurpose,
        status,
        assignedClerkId,
        caseDescription,
        isArchived,
      } = req.body;

      // 1. If caseNumber modified, check for duplicates in workspace
      if (caseNumber && caseNumber.trim() !== caseRecord.caseNumber) {
        const trimmedNumber = caseNumber.trim();
        const existing = await Case.findOne({
          _id: { $ne: caseRecord._id },
          workspaceId,
          caseNumber: { $regex: new RegExp(`^${escapeRegex(trimmedNumber)}$`, 'i') },
        });

        if (existing) {
          res.status(409).json({
            success: false,
            field: 'caseNumber',
            message: `Case number "${trimmedNumber}" already exists in this workspace.`,
          });
          return;
        }
        caseRecord.caseNumber = trimmedNumber;
      }

      // 2. If clientId modified, validate and update snapshot
      if (clientId && clientId !== caseRecord.clientId.toString()) {
        if (!mongoose.Types.ObjectId.isValid(clientId)) {
          res.status(400).json({
            success: false,
            field: 'clientId',
            message: 'Invalid Client ID format.',
          });
          return;
        }

        const client = await Client.findOne({ _id: clientId, workspaceId });
        if (!client) {
          res.status(400).json({
            success: false,
            field: 'clientId',
            message: 'Referenced client does not exist or does not belong to this workspace.',
          });
          return;
        }
        caseRecord.clientId = client._id;
        caseRecord.clientName = client.fullName;
      }

      // 3. If assignedClerkId modified, validate membership
      if (assignedClerkId !== undefined) {
        if (!assignedClerkId || assignedClerkId === '') {
          caseRecord.assignedClerkId = undefined;
        } else {
          if (!mongoose.Types.ObjectId.isValid(assignedClerkId)) {
            res.status(400).json({
              success: false,
              field: 'assignedClerkId',
              message: 'Invalid Clerk ID format.',
            });
            return;
          }

          const clerkMembership = await WorkspaceMembership.findOne({
            workspaceId,
            userId: assignedClerkId,
            status: 'active',
          });

          if (!clerkMembership) {
            res.status(400).json({
              success: false,
              field: 'assignedClerkId',
              message: 'Assigned clerk is not an active member of this workspace.',
            });
            return;
          }
          caseRecord.assignedClerkId = new mongoose.Types.ObjectId(assignedClerkId);
        }
      }

      // Update remaining fields
      if (cnrNumber !== undefined) caseRecord.cnrNumber = cnrNumber.trim().toUpperCase();
      if (caseType) caseRecord.caseType = caseType;
      if (courtName) caseRecord.courtName = courtName.trim();
      if (courtLocation !== undefined) caseRecord.courtLocation = courtLocation.trim();
      if (courtRoomNumber !== undefined) caseRecord.courtRoomNumber = courtRoomNumber.trim();
      if (opponentName) caseRecord.opponentName = opponentName.trim();
      if (opponentAdvocate !== undefined) caseRecord.opponentAdvocate = opponentAdvocate.trim();
      if (filingDate !== undefined) caseRecord.filingDate = filingDate || undefined;
      if (previousHearingDate !== undefined) caseRecord.previousHearingDate = previousHearingDate || undefined;
      if (nextHearingDate !== undefined) caseRecord.nextHearingDate = nextHearingDate || undefined;
      if (nextHearingPurpose !== undefined) caseRecord.nextHearingPurpose = nextHearingPurpose.trim();
      if (status) caseRecord.status = status;
      if (caseDescription !== undefined) caseRecord.caseDescription = caseDescription;
      if (typeof isArchived === 'boolean') caseRecord.isArchived = isArchived;

      await caseRecord.save();

      if (status === 'Disposed' || status === 'Withdrawn') {
        await Reminder.updateMany(
          { workspaceId, caseId: caseRecord._id, reminderType: 'hearing', status: 'Pending' },
          { $set: { status: 'Dismissed' } }
        );
      }

      const populatedCase = await Case.findById(caseRecord._id)
        .populate('clientId', 'fullName mobile email clientType')
        .populate('assignedClerkId', 'fullName email mobile');

      await ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: 'CASE_UPDATED',
        resourceType: 'Case',
        resourceId: caseRecord._id,
        details: { caseNumber: caseRecord.caseNumber },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Case updated successfully.',
        data: populatedCase,
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/cases/:id/archive
  archiveCase: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid case ID format.',
        });
        return;
      }

      const caseRecord = await Case.findOne({ _id: id, workspaceId });
      if (!caseRecord) {
        res.status(404).json({
          success: false,
          message: 'Case not found in this workspace.',
        });
        return;
      }

      const nextArchivedState =
        typeof req.body.isArchived === 'boolean' ? req.body.isArchived : !caseRecord.isArchived;

      caseRecord.isArchived = nextArchivedState;
      await caseRecord.save();

      if (nextArchivedState) {
        await Reminder.updateMany(
          { workspaceId, caseId: caseRecord._id, status: 'Pending' },
          { $set: { status: 'Dismissed' } }
        );
      }

      await ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: nextArchivedState ? 'CASE_ARCHIVED' : 'CASE_UNARCHIVED',
        resourceType: 'Case',
        resourceId: caseRecord._id,
        details: { caseNumber: caseRecord.caseNumber, isArchived: nextArchivedState },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: nextArchivedState ? 'Case archived successfully.' : 'Case restored from archive.',
        data: caseRecord,
      });
    } catch (error) {
      next(error);
    }
  },
};

