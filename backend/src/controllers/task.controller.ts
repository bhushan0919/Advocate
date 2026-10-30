import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import { z } from 'zod';
import { Task } from '../models/Task.js';
import { Case } from '../models/Case.js';
import { WorkspaceMembership } from '../models/WorkspaceMembership.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { notificationService } from '../services/notification.service.js';

export const createTaskSchema = z.object({
  title: z
    .string({ required_error: 'Task title is required' })
    .trim()
    .min(1, 'Task title is required')
    .max(200, 'Task title cannot exceed 200 characters'),
  description: z.string().trim().optional(),
  caseId: z.string().optional().nullable(),
  assignedTo: z.string({ required_error: 'Assigned user is required' }),
  dueDate: z.string({ required_error: 'Due date is required' }),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  status: z.enum(['Pending', 'To Do', 'In Progress', 'Completed', 'Cancelled']).default('To Do'),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().optional(),
  caseId: z.string().optional().nullable(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  status: z.enum(['Pending', 'To Do', 'In Progress', 'Completed', 'Cancelled']).optional(),
});

export const taskController = {
  // GET /api/tasks
  getTasks: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const {
        status,
        priority,
        caseId,
        assignedTo,
        createdBy,
        view,
        isOverdue,
        search,
        page = '1',
        limit = '20',
        sortBy = 'dueDate',
        sortOrder = 'asc',
      } = req.query;

      const filter: any = { workspaceId };

      // View filters
      if (view === 'my') {
        filter.assignedTo = req.user!._id;
      } else if (view === 'assigned_by_me') {
        filter.createdBy = req.user!._id;
      }

      // Status filters
      if (status && typeof status === 'string' && status !== 'all') {
        if (status === 'pending') {
          filter.status = { $in: ['Pending', 'To Do', 'In Progress'] };
        } else {
          filter.status = status;
        }
      }

      // Overdue filter
      if (isOverdue === 'true' || view === 'overdue') {
        filter.dueDate = { $lt: new Date() };
        filter.status = { $in: ['Pending', 'To Do', 'In Progress'] };
      }

      // Priority filter
      if (priority && typeof priority === 'string' && priority !== 'all') {
        filter.priority = priority;
      }

      // Case filter
      if (caseId && typeof caseId === 'string' && Types.ObjectId.isValid(caseId)) {
        filter.caseId = new Types.ObjectId(caseId);
      }

      // Assigned user filter
      if (assignedTo && typeof assignedTo === 'string' && Types.ObjectId.isValid(assignedTo)) {
        filter.assignedTo = new Types.ObjectId(assignedTo);
      }

      // Created by filter
      if (createdBy && typeof createdBy === 'string' && Types.ObjectId.isValid(createdBy)) {
        filter.createdBy = new Types.ObjectId(createdBy);
      }

      // Search filter
      if (search && typeof search === 'string') {
        const term = search.trim();
        if (term) {
          filter.$or = [
            { title: { $regex: term, $options: 'i' } },
            { description: { $regex: term, $options: 'i' } },
            { caseNumber: { $regex: term, $options: 'i' } },
            { clientName: { $regex: term, $options: 'i' } },
          ];
        }
      }

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const sortDir = sortOrder === 'desc' ? -1 : 1;
      const sortObj: any = { [sortBy as string]: sortDir };

      const [tasks, total] = await Promise.all([
        Task.find(filter)
          .populate('assignedTo', 'fullName email mobile')
          .populate('createdBy', 'fullName email')
          .populate('caseId', 'caseNumber courtName clientName opponentName')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum),
        Task.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: {
          tasks,
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

  // GET /api/tasks/summary
  getTaskSummary: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const userId = req.user!._id;
      const now = new Date();

      const [total, pendingCount, inProgressCount, completedCount, overdueCount, myPendingCount] =
        await Promise.all([
          Task.countDocuments({ workspaceId }),
          Task.countDocuments({
            workspaceId,
            status: { $in: ['Pending', 'To Do'] },
          }),
          Task.countDocuments({
            workspaceId,
            status: 'In Progress',
          }),
          Task.countDocuments({
            workspaceId,
            status: 'Completed',
          }),
          Task.countDocuments({
            workspaceId,
            dueDate: { $lt: now },
            status: { $in: ['Pending', 'To Do', 'In Progress'] },
          }),
          Task.countDocuments({
            workspaceId,
            assignedTo: userId,
            status: { $in: ['Pending', 'To Do', 'In Progress'] },
          }),
        ]);

      res.status(200).json({
        success: true,
        data: {
          total,
          pending: pendingCount,
          inProgress: inProgressCount,
          completed: completedCount,
          overdue: overdueCount,
          myPending: myPendingCount,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/tasks/:id
  getTaskById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid task ID format.' });
        return;
      }

      const task = await Task.findOne({ _id: id, workspaceId })
        .populate('assignedTo', 'fullName email mobile')
        .populate('createdBy', 'fullName email')
        .populate('caseId', 'caseNumber courtName clientName opponentName status nextHearingDate');

      if (!task) {
        res.status(404).json({ success: false, message: 'Task not found in this workspace.' });
        return;
      }

      res.status(200).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/tasks
  createTask: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const parseResult = createTaskSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: parseResult.error.errors[0].message,
          errors: parseResult.error.errors,
        });
        return;
      }

      const { title, description, caseId, assignedTo, dueDate, priority, status } =
        parseResult.data;

      // 1. Verify Assigned User belongs to workspace
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
          message: 'Assigned user is not an active member of this workspace.',
        });
        return;
      }

      // 2. Verify Case reference (if provided)
      let resolvedCaseId: Types.ObjectId | undefined = undefined;
      let caseSnapshotNumber = '';
      let caseSnapshotClient = '';

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
        caseSnapshotNumber = caseItem.caseNumber;
        caseSnapshotClient = caseItem.clientName || '';
      }

      // 3. Create Task
      const task = await Task.create({
        workspaceId,
        caseId: resolvedCaseId,
        caseNumber: caseSnapshotNumber,
        clientName: caseSnapshotClient,
        title,
        description: description || '',
        assignedTo: new Types.ObjectId(assignedTo),
        dueDate: new Date(dueDate),
        priority,
        status: status || 'To Do',
        comments: [],
        createdBy: req.user!._id,
      });

      const populatedTask = await Task.findById(task._id)
        .populate('assignedTo', 'fullName email mobile')
        .populate('createdBy', 'fullName email')
        .populate('caseId', 'caseNumber courtName clientName');

      // 4. Send Notification to Assignee
      await notificationService.createNotification({
        workspaceId: workspaceId!,
        userId: assignedTo,
        type: 'task_assigned',
        title: `New Task Assigned: ${task.title}`,
        message: `You were assigned task "${task.title}" (Priority: ${task.priority}) due on ${new Date(
          task.dueDate
        ).toLocaleDateString('en-IN')}.`,
        priority: task.priority,
        taskId: task._id,
        caseId: resolvedCaseId,
        actionUrl: '/tasks',
      });

      // 5. Audit Log
      await ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: 'TASK_CREATED',
        resourceType: 'Task',
        resourceId: task._id,
        details: { title: task.title, assignedTo, priority },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Task created successfully.',
        data: populatedTask,
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/tasks/:id
  updateTask: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid task ID format.' });
        return;
      }

      const task = await Task.findOne({ _id: id, workspaceId });
      if (!task) {
        res.status(404).json({ success: false, message: 'Task not found in this workspace.' });
        return;
      }

      // Role check: Clerks can only update tasks assigned to them or created by them
      const isOwnerOrAdvocate =
        req.workspaceMembership?.role === 'owner' || req.workspaceMembership?.role === 'advocate';
      const isAssignee = task.assignedTo.toString() === req.user!._id.toString();
      const isCreator = task.createdBy.toString() === req.user!._id.toString();

      if (!isOwnerOrAdvocate && !isAssignee && !isCreator) {
        res.status(403).json({
          success: false,
          message: 'You lack permission to update this task.',
        });
        return;
      }

      const parseResult = updateTaskSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: parseResult.error.errors[0].message,
        });
        return;
      }

      const data = parseResult.data;

      // Handle re-assignment if assignedTo changed
      const oldAssignee = task.assignedTo.toString();
      if (data.assignedTo && data.assignedTo !== oldAssignee) {
        if (!isOwnerOrAdvocate && !isCreator) {
          res.status(403).json({
            success: false,
            message: 'Only advocates or task creators can reassign tasks.',
          });
          return;
        }

        const newAssigneeMembership = await WorkspaceMembership.findOne({
          workspaceId,
          userId: data.assignedTo,
          status: 'active',
        });

        if (!newAssigneeMembership) {
          res.status(400).json({
            success: false,
            message: 'New assignee is not an active member of this workspace.',
          });
          return;
        }

        task.assignedTo = new Types.ObjectId(data.assignedTo);

        // Notify new assignee
        await notificationService.createNotification({
          workspaceId: workspaceId!,
          userId: data.assignedTo,
          type: 'task_assigned',
          title: `Task Reassigned to You: ${task.title}`,
          message: `Task "${task.title}" has been assigned to you.`,
          priority: task.priority,
          taskId: task._id,
          actionUrl: '/tasks',
        });
      }

      if (data.title !== undefined) task.title = data.title;
      if (data.description !== undefined) task.description = data.description;
      if (data.dueDate !== undefined) task.dueDate = new Date(data.dueDate);
      if (data.priority !== undefined) task.priority = data.priority;
      if (data.status !== undefined) {
        task.status = data.status;
        if (data.status === 'Completed' && !task.completedAt) {
          task.completedAt = new Date();
        } else if (data.status !== 'Completed') {
          task.completedAt = undefined;
        }
      }

      await task.save();

      const updated = await Task.findById(task._id)
        .populate('assignedTo', 'fullName email mobile')
        .populate('createdBy', 'fullName email')
        .populate('caseId', 'caseNumber courtName clientName');

      res.status(200).json({
        success: true,
        message: 'Task updated successfully.',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/tasks/:id/status
  updateTaskStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;
      const { status } = req.body;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid task ID format.' });
        return;
      }

      if (!['Pending', 'To Do', 'In Progress', 'Completed', 'Cancelled'].includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status value provided.' });
        return;
      }

      const task = await Task.findOne({ _id: id, workspaceId });
      if (!task) {
        res.status(404).json({ success: false, message: 'Task not found in this workspace.' });
        return;
      }

      task.status = status;
      if (status === 'Completed') {
        task.completedAt = new Date();
      } else {
        task.completedAt = undefined;
      }

      await task.save();

      res.status(200).json({
        success: true,
        message: `Task status updated to ${status}.`,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/tasks/:id/comments
  addTaskComment: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;
      const { comment } = req.body;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid task ID format.' });
        return;
      }

      if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
        res.status(400).json({ success: false, message: 'Comment text is required.' });
        return;
      }

      const task = await Task.findOne({ _id: id, workspaceId });
      if (!task) {
        res.status(404).json({ success: false, message: 'Task not found in this workspace.' });
        return;
      }

      task.comments.push({
        userId: req.user!._id,
        userName: req.user!.fullName,
        comment: comment.trim(),
        createdAt: new Date(),
      });

      await task.save();

      const populatedTask = await Task.findById(task._id)
        .populate('assignedTo', 'fullName email mobile')
        .populate('createdBy', 'fullName email')
        .populate('caseId', 'caseNumber courtName clientName');

      res.status(200).json({
        success: true,
        message: 'Comment added successfully.',
        data: populatedTask,
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/tasks/:id
  deleteTask: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid task ID format.' });
        return;
      }

      const task = await Task.findOne({ _id: id, workspaceId });
      if (!task) {
        res.status(404).json({ success: false, message: 'Task not found in this workspace.' });
        return;
      }

      const isOwnerOrAdvocate =
        req.workspaceMembership?.role === 'owner' || req.workspaceMembership?.role === 'advocate';
      const isCreator = task.createdBy.toString() === req.user!._id.toString();

      if (!isOwnerOrAdvocate && !isCreator) {
        res.status(403).json({
          success: false,
          message: 'Clerks cannot delete tasks created by chamber advocates.',
        });
        return;
      }

      await Task.deleteOne({ _id: id, workspaceId });

      await ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: 'TASK_DELETED',
        resourceType: 'Task',
        resourceId: task._id,
        details: { title: task.title },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: `Task "${task.title}" deleted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  },
};
