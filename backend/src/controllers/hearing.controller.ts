import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Hearing } from '../models/Hearing.js';
import { Case } from '../models/Case.js';
import { Reminder } from '../models/Reminder.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { notificationService } from '../services/notification.service.js';
import { runInTransaction } from '../utils/transaction.js';
import { parseDateOnly, getCalendarDayRange } from '../utils/date.js';

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const createHearingSchema = z.object({
  body: z.object({
    hearingDate: z.string({ required_error: 'Hearing date is required' }),
    purpose: z
      .string({ required_error: 'Purpose of hearing is required' })
      .trim()
      .min(1, 'Purpose of hearing is required')
      .max(200, 'Purpose cannot exceed 200 characters'),
    proceedings: z
      .string({ required_error: 'Today proceedings are required' })
      .trim()
      .min(1, 'Please record proceedings / what happened today'),
    nextHearingDate: z.string({ required_error: 'Next hearing date is required' }),
    nextHearingPurpose: z
      .string({ required_error: 'Next hearing purpose is required' })
      .trim()
      .min(1, 'Next hearing purpose is required')
      .max(200, 'Next hearing purpose cannot exceed 200 characters'),
    courtName: z.string().trim().optional(),
    courtRoom: z.string().trim().optional(),
    additionalRemarks: z.string().trim().optional(),
    associatedOrderUrl: z.string().trim().optional(),
  }),
});

export const correctHearingSchema = z.object({
  body: z.object({
    reason: z
      .string({ required_error: 'Correction audit reason is required' })
      .trim()
      .min(3, 'Please provide an audit reason for modifying this historical record'),
    purpose: z.string().trim().optional(),
    proceedings: z.string().trim().optional(),
    nextHearingDate: z.string().optional(),
    nextHearingPurpose: z.string().trim().optional(),
    courtName: z.string().trim().optional(),
    courtRoom: z.string().trim().optional(),
    additionalRemarks: z.string().trim().optional(),
  }),
});

export const hearingController = {
  // POST /api/cases/:id/hearings
  createCaseHearing: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: caseId } = req.params;
      const workspaceId = req.workspaceId;
      const userId = req.user!._id;

      if (!mongoose.Types.ObjectId.isValid(caseId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid Case ID format.',
        });
        return;
      }

      const caseDoc = await Case.findOne({ _id: caseId, workspaceId });
      if (!caseDoc) {
        res.status(404).json({
          success: false,
          message: 'Case not found in this workspace.',
        });
        return;
      }

      const {
        hearingDate,
        purpose,
        proceedings,
        nextHearingDate,
        nextHearingPurpose,
        courtName,
        courtRoom,
        additionalRemarks,
        associatedOrderUrl,
      } = req.body;

      const parsedHearingDate = parseDateOnly(hearingDate);
      const parsedNextHearingDate = parseDateOnly(nextHearingDate);

      if (!parsedHearingDate) {
        res.status(400).json({
          success: false,
          field: 'hearingDate',
          message: 'Invalid hearing date format.',
        });
        return;
      }

      if (!parsedNextHearingDate) {
        res.status(400).json({
          success: false,
          field: 'nextHearingDate',
          message: 'Invalid next hearing date format.',
        });
        return;
      }

      // Chronological validation: nextHearingDate must be >= hearingDate
      if (parsedNextHearingDate.getTime() < parsedHearingDate.getTime()) {
        res.status(400).json({
          success: false,
          field: 'nextHearingDate',
          message: 'Next hearing date cannot be earlier than today’s hearing date.',
        });
        return;
      }

      // Duplicate submission protection (check if identical hearing was recorded within last 10 seconds)
      const recentDuplicate = await Hearing.findOne({
        workspaceId,
        caseId: caseDoc._id,
        hearingDate: parsedHearingDate,
        proceedings: proceedings.trim(),
        createdAt: { $gte: new Date(Date.now() - 10000) },
      });

      if (recentDuplicate) {
        res.status(409).json({
          success: false,
          message: 'Duplicate hearing submission detected. Hearing was already recorded.',
          data: recentDuplicate,
        });
        return;
      }

      // Execute within transaction
      const result = await runInTransaction(async (session) => {
        // 1. Create Hearing historical record (never overwrite)
        const hearingData = {
          workspaceId,
          caseId: caseDoc._id,
          caseNumber: caseDoc.caseNumber,
          clientName: caseDoc.clientName,
          opponentName: caseDoc.opponentName,
          caseType: caseDoc.caseType,
          hearingDate: parsedHearingDate,
          courtName: courtName?.trim() || caseDoc.courtName,
          courtRoom: courtRoom?.trim() || caseDoc.courtRoomNumber || '',
          purpose: purpose.trim(),
          proceedings: proceedings.trim(),
          nextHearingDate: parsedNextHearingDate,
          nextHearingPurpose: nextHearingPurpose.trim(),
          additionalRemarks: additionalRemarks?.trim() || '',
          associatedOrderUrl: associatedOrderUrl?.trim() || '',
          createdBy: userId,
          recordedBy: userId,
          corrections: [],
        };

        const newHearing = session
          ? (await Hearing.create([hearingData], { session }))[0]
          : await Hearing.create(hearingData);

        // 2. Synchronize Case record
        caseDoc.previousHearingDate = parsedHearingDate;
        caseDoc.nextHearingDate = parsedNextHearingDate;
        caseDoc.nextHearingPurpose = nextHearingPurpose.trim();

        if (courtName?.trim()) caseDoc.courtName = courtName.trim();
        if (courtRoom !== undefined) caseDoc.courtRoomNumber = courtRoom.trim();

        if (session) {
          await caseDoc.save({ session });
        } else {
          await caseDoc.save();
        }

        // 3. Log Activity
        const activityData = {
          workspaceId,
          userId,
          action: 'HEARING_RECORDED',
          resourceType: 'Hearing',
          resourceId: newHearing._id,
          details: {
            caseId: caseDoc._id,
            caseNumber: caseDoc.caseNumber,
            hearingDate: parsedHearingDate,
            nextHearingDate: parsedNextHearingDate,
            purpose: purpose.trim(),
          },
          ipAddress: req.ip,
        };

        if (session) {
          await ActivityLog.create([activityData], { session });
        } else {
          await ActivityLog.create(activityData);
        }

        return { newHearing, updatedCase: caseDoc };
      });

      // Post-transaction side-effects (non-blocking for main transaction)
      try {
        // Invalidate or complete previous pending reminders for this hearing date
        await Reminder.updateMany(
          {
            workspaceId,
            caseId: caseDoc._id,
            reminderType: 'hearing',
            status: 'Pending',
            hearingDate: { $lte: parsedHearingDate },
          },
          { $set: { status: 'Completed' } }
        );

        // Schedule automatic 1-day-before reminder for the new nextHearingDate
        const oneDayBefore = new Date(parsedNextHearingDate);
        oneDayBefore.setDate(oneDayBefore.getDate() - 1);
        oneDayBefore.setHours(9, 0, 0, 0);

        const existingReminder = await Reminder.findOne({
          workspaceId,
          caseId: caseDoc._id,
          intervalType: '1_day_before',
          hearingDate: parsedNextHearingDate,
          status: 'Pending',
        });

        if (!existingReminder) {
          await Reminder.create({
            workspaceId,
            caseId: caseDoc._id,
            hearingId: result.newHearing._id,
            title: `Hearing tomorrow: ${caseDoc.caseNumber}`,
            description: `Hearing scheduled in ${caseDoc.courtName} (${caseDoc.courtRoomNumber || 'Court'}). Purpose: ${nextHearingPurpose.trim()}`,
            reminderType: 'hearing',
            intervalType: '1_day_before',
            hearingDate: parsedNextHearingDate,
            reminderDate: oneDayBefore,
            priority: 'High',
            assignedTo: caseDoc.assignedClerkId || userId,
            status: 'Pending',
            isNotified: false,
            caseNumber: caseDoc.caseNumber,
            clientName: caseDoc.clientName,
            courtName: caseDoc.courtName,
            hearingPurpose: nextHearingPurpose.trim(),
            createdBy: userId,
          });
        }

        // Broadcast hearing_rescheduled notification to workspace team
        const nextDateStr = parsedNextHearingDate.toISOString().split('T')[0];
        await notificationService.notifyWorkspaceUsers(workspaceId!, {
          type: 'hearing_rescheduled',
          title: `Hearing Rescheduled: ${caseDoc.caseNumber}`,
          message: `Case ${caseDoc.caseNumber} (${caseDoc.clientName} v. ${caseDoc.opponentName}) has been adjourned to ${nextDateStr} for ${nextHearingPurpose.trim()}.`,
          actionUrl: `/cases/${caseDoc._id}`,
          caseId: caseDoc._id,
          hearingId: result.newHearing._id,
          priority: 'Medium',
        });
      } catch (postProcErr) {
        console.error('[HearingController] Post-hearing reminder/notification error:', postProcErr);
      }

      const populatedHearing = await Hearing.findById(result.newHearing._id)
        .populate('createdBy', 'fullName email mobile')
        .populate('caseId', 'caseNumber caseType courtName status');

      res.status(201).json({
        success: true,
        message: 'Hearing proceedings recorded successfully and next date scheduled.',
        data: {
          hearing: populatedHearing,
          case: result.updatedCase,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/cases/:id/hearings
  getCaseHearings: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: caseId } = req.params;
      const workspaceId = req.workspaceId;

      if (!mongoose.Types.ObjectId.isValid(caseId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid Case ID format.',
        });
        return;
      }

      // Verify case exists in this workspace
      const caseDoc = await Case.findOne({ _id: caseId, workspaceId });
      if (!caseDoc) {
        res.status(404).json({
          success: false,
          message: 'Case not found in this workspace.',
        });
        return;
      }

      // Chronological timeline: newest hearing first
      const hearings = await Hearing.find({
        workspaceId,
        caseId: caseDoc._id,
      })
        .sort({ hearingDate: -1, createdAt: -1 })
        .populate('createdBy', 'fullName email mobile')
        .populate('corrections.correctedBy', 'fullName email');

      res.status(200).json({
        success: true,
        data: hearings,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/hearings (Workspace-wide hearing register)
  getWorkspaceHearings: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
      const skip = (page - 1) * limit;

      const filter: any = { workspaceId };

      // Search across caseNumber, clientName, opponentName, courtName, proceedings
      const search = (req.query.search || req.query.q) as string | undefined;
      if (search && search.trim()) {
        const escaped = escapeRegex(search.trim());
        filter.$or = [
          { caseNumber: { $regex: escaped, $options: 'i' } },
          { clientName: { $regex: escaped, $options: 'i' } },
          { opponentName: { $regex: escaped, $options: 'i' } },
          { courtName: { $regex: escaped, $options: 'i' } },
          { purpose: { $regex: escaped, $options: 'i' } },
          { proceedings: { $regex: escaped, $options: 'i' } },
        ];
      }

      if (req.query.caseNumber && typeof req.query.caseNumber === 'string') {
        filter.caseNumber = { $regex: escapeRegex(req.query.caseNumber.trim()), $options: 'i' };
      }

      if (req.query.client && typeof req.query.client === 'string') {
        filter.clientName = { $regex: escapeRegex(req.query.client.trim()), $options: 'i' };
      }

      if (req.query.opponent && typeof req.query.opponent === 'string') {
        filter.opponentName = { $regex: escapeRegex(req.query.opponent.trim()), $options: 'i' };
      }

      if (req.query.court && typeof req.query.court === 'string') {
        filter.courtName = { $regex: escapeRegex(req.query.court.trim()), $options: 'i' };
      }

      if (req.query.caseType && typeof req.query.caseType === 'string') {
        filter.caseType = req.query.caseType.trim();
      }

      // Filter by Hearing Date
      if (req.query.hearingDate && typeof req.query.hearingDate === 'string') {
        filter.hearingDate = getCalendarDayRange(req.query.hearingDate);
      } else if (req.query.startDate || req.query.endDate) {
        filter.hearingDate = {};
        if (req.query.startDate) {
          const s = parseDateOnly(req.query.startDate as string);
          if (s) filter.hearingDate.$gte = s;
        }
        if (req.query.endDate) {
          const e = parseDateOnly(req.query.endDate as string);
          if (e) {
            e.setUTCHours(23, 59, 59, 999);
            filter.hearingDate.$lte = e;
          }
        }
      }

      // Filter by Updated/Created By User
      const updatedBy = (req.query.updatedBy || req.query.createdBy) as string | undefined;
      if (updatedBy && mongoose.Types.ObjectId.isValid(updatedBy)) {
        filter.createdBy = new mongoose.Types.ObjectId(updatedBy);
      }

      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

      const [hearings, total] = await Promise.all([
        Hearing.find(filter)
          .sort({ hearingDate: sortOrder, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'fullName email mobile')
          .populate('caseId', 'caseNumber caseType courtName courtRoomNumber status'),
        Hearing.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: {
          hearings,
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

  // GET /api/hearings/:id
  getHearingById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid Hearing ID format.',
        });
        return;
      }

      const hearing = await Hearing.findOne({ _id: id, workspaceId })
        .populate('createdBy', 'fullName email mobile')
        .populate('corrections.correctedBy', 'fullName email')
        .populate('caseId');

      if (!hearing) {
        res.status(404).json({
          success: false,
          message: 'Hearing record not found in this workspace.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: hearing,
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/hearings/:id/correct (Controlled audited correction)
  correctHearing: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;
      const userId = req.user!._id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid Hearing ID format.',
        });
        return;
      }

      const hearing = await Hearing.findOne({ _id: id, workspaceId });
      if (!hearing) {
        res.status(404).json({
          success: false,
          message: 'Hearing record not found in this workspace.',
        });
        return;
      }

      const {
        reason,
        purpose,
        proceedings,
        nextHearingDate,
        nextHearingPurpose,
        courtName,
        courtRoom,
        additionalRemarks,
      } = req.body;

      // Capture previous values snapshot for audit trail
      const previousValues: Record<string, any> = {
        purpose: hearing.purpose,
        proceedings: hearing.proceedings,
        nextHearingDate: hearing.nextHearingDate,
        nextHearingPurpose: hearing.nextHearingPurpose,
        courtName: hearing.courtName,
        courtRoom: hearing.courtRoom,
        additionalRemarks: hearing.additionalRemarks,
      };

      // Add audit entry
      hearing.corrections.push({
        correctedBy: userId,
        correctedAt: new Date(),
        reason: reason.trim(),
        previousValues,
      });

      // Apply modifications
      if (purpose) hearing.purpose = purpose.trim();
      if (proceedings) hearing.proceedings = proceedings.trim();
      if (courtName) hearing.courtName = courtName.trim();
      if (courtRoom !== undefined) hearing.courtRoom = courtRoom.trim();
      if (additionalRemarks !== undefined) hearing.additionalRemarks = additionalRemarks.trim();

      if (nextHearingDate) {
        const parsed = parseDateOnly(nextHearingDate);
        if (parsed) hearing.nextHearingDate = parsed;
      }

      if (nextHearingPurpose) hearing.nextHearingPurpose = nextHearingPurpose.trim();

      await hearing.save();

      // Check if this hearing is the latest one for the case; if so, update Case
      const latestHearing = await Hearing.findOne({ workspaceId, caseId: hearing.caseId }).sort({
        hearingDate: -1,
        createdAt: -1,
      });

      if (latestHearing && latestHearing._id.toString() === hearing._id.toString()) {
        const caseDoc = await Case.findOne({ _id: hearing.caseId, workspaceId });
        if (caseDoc) {
          if (hearing.nextHearingDate) caseDoc.nextHearingDate = hearing.nextHearingDate;
          if (hearing.nextHearingPurpose) caseDoc.nextHearingPurpose = hearing.nextHearingPurpose;
          await caseDoc.save();
        }
      }

      await ActivityLog.create({
        workspaceId,
        userId,
        action: 'HEARING_CORRECTED',
        resourceType: 'Hearing',
        resourceId: hearing._id,
        details: {
          caseNumber: hearing.caseNumber,
          reason: reason.trim(),
        },
        ipAddress: req.ip,
      });

      const populated = await Hearing.findById(hearing._id)
        .populate('createdBy', 'fullName email')
        .populate('corrections.correctedBy', 'fullName email')
        .populate('caseId');

      res.status(200).json({
        success: true,
        message: 'Hearing record corrected with historical audit trail.',
        data: populated,
      });
    } catch (error) {
      next(error);
    }
  },
};

