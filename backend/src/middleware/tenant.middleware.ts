import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { WorkspaceMembership } from '../models/WorkspaceMembership.js';

export const requireWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required before resolving workspace context.',
      });
      return;
    }

    const requestedWorkspaceId = req.headers['x-workspace-id'] as string | undefined;

    let membership;

    if (requestedWorkspaceId && mongoose.Types.ObjectId.isValid(requestedWorkspaceId)) {
      membership = await WorkspaceMembership.findOne({
        workspaceId: new mongoose.Types.ObjectId(requestedWorkspaceId),
        userId: req.user._id,
        status: 'active',
      }).populate('workspaceId');
    } else {
      // Find the user's primary/owner workspace first, or their first active workspace
      membership = await WorkspaceMembership.findOne({
        userId: req.user._id,
        status: 'active',
        role: 'owner',
      }).populate('workspaceId');

      if (!membership) {
        membership = await WorkspaceMembership.findOne({
          userId: req.user._id,
          status: 'active',
        }).populate('workspaceId');
      }
    }

    if (!membership || !membership.workspaceId) {
      res.status(403).json({
        success: false,
        code: 'NO_ACTIVE_WORKSPACE',
        message: 'No active workspace membership found for this user.',
      });
      return;
    }

    // Set server-verified tenant context
    req.workspaceId = membership.workspaceId._id || membership.workspaceId;
    req.workspaceMembership = {
      _id: membership._id,
      workspaceId: req.workspaceId,
      role: membership.role,
      permissions: membership.permissions,
    };

    next();
  } catch (error) {
    console.error('Workspace isolation middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify workspace authorization.',
    });
  }
};

