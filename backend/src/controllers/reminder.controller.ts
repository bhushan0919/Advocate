import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import { z } from 'zod';
import { Reminder } from '../models/Reminder.js';
import { Case } from '../models/Case.js';
import { WorkspaceMembership } from '../models/WorkspaceMembership.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { notificationService } from '../services/notification.service.js';
import { formatDateOnly, getCalendarDayRange } from '../utils/date.js';

export const createReminderSchema = z.object({
  title: z
    .string({ required_error: 'Reminder title is required' })
    .trim()
    .min(1, 'Reminder title is required')
    .max(200, 'Reminder title cannot exceed 200 characters'),
  description: z.string().trim().optional(),
  reminderType: z.enum(['hearing', 'custom']).default('custom'),
  intervalType: z
    .enum(['1_day_before', '3_days_before', '7_days_before', 'custom', 'manual'])
    .optional(),
  caseId: z.string().optional().nullable(),
  hearingId: z.string().optional().nullable(),
  hearingDate: z.string().optional().nullable(),
  reminderDate: z.string({ required_error: 'Reminder date/time is required' }),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  assignedTo: z.string().optional(),
});

export const updateReminderSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().optional(),
  reminderDate: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  assignedTo: z.string().optional(),
  status: z.enum(['Pending', 'Completed', 'Dismissed', 'Snoozed']).optional(),
});

export const reminderController = {
  // GET /api/reminders
  getReminders: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const {
        status,
        reminderType,
        caseId,
        priority,
        view,
        date,
        page = '1',
        limit = '50',
      } = req.query;

      const filter: any = { workspaceId };

      // Status filter
      if (status && typeof status === 'string' && status !== 'all') {
        filter.status = status;
      } else if (!status) {
        // Default to showing Pending & Snoozed
        filter.status = { $in: ['Pending', 'Snoozed'] };
      }

      // Type filter
      if (reminderType && typeof reminderType === 'string' && reminderType !== 'all') {
        filter.reminderType = reminderType;
      }

      // Priority filter
      if (priority && typeof priority === 'string' && priority !== 'all') {
        filter.priority = priority;
      }

      // Case filter
      if (caseId && typeof caseId === 'string' && Types.ObjectId.isValid(caseId)) {
        filter.caseId = new Types.ObjectId(caseId);
      }

      // View filters
      const now = new Date();
      if (view === 'today') {
        const todayStr = (date as string) || formatDateOnly(now);
        const dayRange = getCalendarDayRange(todayStr);
        filter.reminderDate = dayRange;
      } else if (view === 'upcoming') {
        filter.reminderDate = { $gte: now };
        filter.status = 'Pending';
      } else if (view === 'overdue') {
        filter.reminderDate = { $lt: now };
        filter.status = 'Pending';
      }

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [reminders, total] = await Promise.all([
        Reminder.find(filter)
          .populate('assignedTo', 'fullName email mobile')
          .populate('createdBy', 'fullName email')
          .populate('caseId', 'caseNumber courtName clientName opponentName nextHearingDate')
          .sort({ reminderDate: 1, priority: -1 })
          .skip(skip)
          .limit(limitNum),
        Reminder.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: {
          reminders,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/reminders
  createReminder: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const parseResult = createReminderSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: parseResult.error.errors[0].message,
          errors: parseResult.error.errors,
        });
        return;
      }

      const {
        title,
        description,
        reminderType,
        intervalType,
        caseId,
        hearingId,
        hearingDate,
        reminderDate,
        priority,
        assignedTo,
      } = parseResult.data;

      // Assignee default to current user if omitted
      let targetUserId = req.user!._id;
      if (assignedTo && assignedTo.trim() !== '') {
        if (!Types.ObjectId.isValid(assignedTo)) {
          res.status(400).json({ success: false, message: 'Invalid assigned user ID format.' });
          return;
        }

        const membership = await WorkspaceMembership.findOne({
          workspaceId,
          userId: assignedTo,
          status: 'active',
        });

        if (!membership) {
          res.status(400).json({
            success: false,
            message: 'Assigned user does not belong to this chamber workspace.',
          });
          return;
        }

        targetUserId = new Types.ObjectId(assignedTo);
      }

      // Case info lookup if linked
      let resolvedCaseId: Types.ObjectId | undefined = undefined;
      let caseNumber = '';
      let clientName = '';
      let courtName = '';
      let hearingPurpose = '';

      if (caseId && caseId.trim() !== '') {
        if (!Types.ObjectId.isValid(caseId)) {
          res.status(400).json({ success: false, message: 'Invalid case ID format.' });
          return;
        }

        const caseItem = await Case.findOne({ _id: caseId, workspaceId });
        if (!caseItem) {
          res.status(400).json({
            success: false,
            message: 'Referenced case not found in this workspace.',
          });
          return;
        }

        resolvedCaseId = caseItem._id;
        caseNumber = caseItem.caseNumber;
        clientName = caseItem.clientName || '';
        courtName = caseItem.courtName;
        hearingPurpose = caseItem.nextHearingPurpose || 'Hearing';
      }

      // Deduplication check for hearing reminders with identical interval
      if (resolvedCaseId && reminderType === 'hearing' && intervalType && intervalType !== 'custom') {
        const existing = await Reminder.findOne({
          workspaceId,
          caseId: resolvedCaseId,
          intervalType,
          status: 'Pending',
        });

        if (existing) {
          res.status(409).json({
            success: false,
            message: `A ${intervalType.replace(/_/g, ' ')} reminder already exists for this case hearing.`,
            data: existing,
          });
          return;
        }
      }

      const reminder = await Reminder.create({
        workspaceId,
        caseId: resolvedCaseId,
        hearingId: hearingId && Types.ObjectId.isValid(hearingId) ? new Types.ObjectId(hearingId) : undefined,
        title,
        description: description || '',
        reminderType,
        intervalType: intervalType || 'custom',
        hearingDate: hearingDate ? new Date(hearingDate) : undefined,
        reminderDate: new Date(reminderDate),
        priority,
        assignedTo: targetUserId,
        status: 'Pending',
        isNotified: false,
        caseNumber,
        clientName,
        courtName,
        hearingPurpose,
        createdBy: req.user!._id,
      });

      const populated = await Reminder.findById(reminder._id)
        .populate('assignedTo', 'fullName email mobile')
        .populate('createdBy', 'fullName email')
        .populate('caseId', 'caseNumber courtName clientName');

      res.status(201).json({
        success: true,
        message: 'Reminder created successfully.',
        data: populated,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/reminders/generate-hearing-reminders
  generateHearingReminders: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const { caseId, hearingDate, intervals = ['1_day_before', '3_days_before'] } = req.body;

      if (!caseId || !Types.ObjectId.isValid(caseId)) {
        res.status(400).json({ success: false, message: 'Valid caseId is required.' });
        return;
      }

      const caseItem = await Case.findOne({ _id: caseId, workspaceId });
      if (!caseItem) {
        res.status(404).json({ success: false, message: 'Case not found in this workspace.' });
        return;
      }

      const hDate = hearingDate ? new Date(hearingDate) : caseItem.nextHearingDate;
      if (!hDate || isNaN(hDate.getTime())) {
        res.status(400).json({ success: false, message: 'Valid hearingDate is required.' });
        return;
      }

      const createdReminders = [];

      for (const interval of intervals) {
        let daysBefore = 1;
        if (interval === '3_days_before') daysBefore = 3;
        if (interval === '7_days_before') daysBefore = 7;

        // Calculate reminder date: hearingDate minus daysBefore at 09:00 AM IST
        const rDate = new Date(hDate);
        rDate.setDate(rDate.getDate() - daysBefore);
        rDate.setHours(9, 0, 0, 0);

        // Check duplicate
        const existing = await Reminder.findOne({
          workspaceId,
          caseId: caseItem._id,
          intervalType: interval,
          status: 'Pending',
        });

        if (!existing) {
          const reminder = await Reminder.create({
            workspaceId,
            caseId: caseItem._id,
            title: `Hearing in ${daysBefore} ${daysBefore === 1 ? 'day' : 'days'}: ${caseItem.caseNumber}`,
            description: `Hearing scheduled for ${caseItem.clientName} in ${caseItem.courtName} (${caseItem.courtRoomNumber || 'Court'}). Purpose: ${caseItem.nextHearingPurpose || 'Hearing'}.`,
            reminderType: 'hearing',
            intervalType: interval,
            hearingDate: hDate,
            reminderDate: rDate,
            priority: daysBefore === 1 ? 'Urgent' : 'High',
            assignedTo: caseItem.assignedClerkId || req.user!._id,
            status: 'Pending',
            isNotified: false,
            caseNumber: caseItem.caseNumber,
            clientName: caseItem.clientName,
            courtName: caseItem.courtName,
            hearingPurpose: caseItem.nextHearingPurpose || 'Hearing',
            createdBy: req.user!._id,
          });

          createdReminders.push(reminder);
        }
      }

      res.status(201).json({
        success: true,
        message: `Generated ${createdReminders.length} hearing reminder(s).`,
        data: createdReminders,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/reminders/:id
  getReminderById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid reminder ID format.' });
        return;
      }

      const reminder = await Reminder.findOne({ _id: id, workspaceId })
        .populate('assignedTo', 'fullName email mobile')
        .populate('createdBy', 'fullName email')
        .populate('caseId', 'caseNumber courtName clientName nextHearingDate');

      if (!reminder) {
        res.status(404).json({ success: false, message: 'Reminder not found.' });
        return;
      }

      res.status(200).json({ success: true, data: reminder });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/reminders/:id
  updateReminder: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid reminder ID format.' });
        return;
      }

      const reminder = await Reminder.findOne({ _id: id, workspaceId });
      if (!reminder) {
        res.status(404).json({ success: false, message: 'Reminder not found.' });
        return;
      }

      const parseResult = updateReminderSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: parseResult.error.errors[0].message,
        });
        return;
      }

      const data = parseResult.data;

      if (data.title !== undefined) reminder.title = data.title;
      if (data.description !== undefined) reminder.description = data.description;
      if (data.reminderDate !== undefined) {
        reminder.reminderDate = new Date(data.reminderDate);
        reminder.isNotified = false; // reset notification if rescheduled
      }
      if (data.priority !== undefined) reminder.priority = data.priority;
      if (data.status !== undefined) reminder.status = data.status;

      if (data.assignedTo !== undefined) {
        if (!Types.ObjectId.isValid(data.assignedTo)) {
          res.status(400).json({ success: false, message: 'Invalid assigned user ID format.' });
          return;
        }
        reminder.assignedTo = new Types.ObjectId(data.assignedTo);
      }

      await reminder.save();

      res.status(200).json({
        success: true,
        message: 'Reminder updated successfully.',
        data: reminder,
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/reminders/:id/complete
  completeReminder: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid reminder ID format.' });
        return;
      }

      const reminder = await Reminder.findOne({ _id: id, workspaceId });
      if (!reminder) {
        res.status(404).json({ success: false, message: 'Reminder not found.' });
        return;
      }

      reminder.status = 'Completed';
      await reminder.save();

      res.status(200).json({
        success: true,
        message: 'Reminder marked as completed.',
        data: reminder,
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/reminders/:id/dismiss
  dismissReminder: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid reminder ID format.' });
        return;
      }

      const reminder = await Reminder.findOne({ _id: id, workspaceId });
      if (!reminder) {
        res.status(404).json({ success: false, message: 'Reminder not found.' });
        return;
      }

      reminder.status = 'Dismissed';
      await reminder.save();

      res.status(200).json({
        success: true,
        message: 'Reminder dismissed.',
        data: reminder,
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/reminders/:id/snooze
  snoozeReminder: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;
      const { snoozeMinutes = 1440, newDate } = req.body; // Default 1 day (1440 min)

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid reminder ID format.' });
        return;
      }

      const reminder = await Reminder.findOne({ _id: id, workspaceId });
      if (!reminder) {
        res.status(404).json({ success: false, message: 'Reminder not found.' });
        return;
      }

      let snoozeTime: Date;
      if (newDate) {
        snoozeTime = new Date(newDate);
      } else {
        snoozeTime = new Date(Date.now() + snoozeMinutes * 60 * 1000);
      }

      reminder.status = 'Snoozed';
      reminder.snoozedUntil = snoozeTime;
      reminder.reminderDate = snoozeTime;
      reminder.isNotified = false; // Allow re-notification when snooze time arrives

      await reminder.save();

      res.status(200).json({
        success: true,
        message: `Reminder snoozed until ${snoozeTime.toLocaleString('en-IN')}.`,
        data: reminder,
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/reminders/:id
  deleteReminder: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid reminder ID format.' });
        return;
      }

      const reminder = await Reminder.findOne({ _id: id, workspaceId });
      if (!reminder) {
        res.status(404).json({ success: false, message: 'Reminder not found.' });
        return;
      }

      await Reminder.deleteOne({ _id: id, workspaceId });

      res.status(200).json({
        success: true,
        message: `Reminder "${reminder.title}" deleted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/reminders/process-due
  processDueRemindersNow: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const processedCount = await notificationService.processDueReminders();
      const overdueTasks = await notificationService.checkOverdueTasks();

      res.status(200).json({
        success: true,
        message: `Processed ${processedCount} due reminder(s) and ${overdueTasks} overdue task(s).`,
        data: {
          processedReminders: processedCount,
          triggered: processedCount,
          overdueTasks,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
