import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMembership, DEFAULT_CLERK_PERMISSIONS } from '../models/WorkspaceMembership.js';
import { Invitation } from '../models/Invitation.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { generateInvitationToken } from '../utils/jwt.js';
import { ENV } from '../config/env.js';

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    role: z.enum(['clerk', 'advocate']).default('clerk'),
    permissions: z.array(z.string()).optional(),
  }),
});

export const updateSettingsSchema = z.object({
  body: z.object({
    officeName: z.string().optional(),
    address: z.string().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email().optional(),
    settings: z
      .object({
        timezone: z.string().optional(),
        dateFormat: z.string().optional(),
        caseTypes: z.array(z.string()).optional(),
        caseStatuses: z.array(z.string()).optional(),
        reminderDaysBefore: z.array(z.number()).optional(),
      })
      .optional(),
  }),
});

export const workspaceController = {
  // Get Current Workspace details
  getCurrentWorkspace: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspace = await Workspace.findById(req.workspaceId).populate(
        'ownerId',
        'fullName email mobile barCouncilNumber'
      );

      if (!workspace) {
        res.status(404).json({ success: false, message: 'Workspace not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          workspace,
          currentUserMembership: req.workspaceMembership,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Update Workspace Settings
  updateWorkspaceSettings: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { officeName, address, contactPhone, contactEmail, settings } = req.body;

      const workspace = await Workspace.findById(req.workspaceId);
      if (!workspace) {
        res.status(404).json({ success: false, message: 'Workspace not found.' });
        return;
      }

      if (officeName) workspace.officeName = officeName;
      if (address) workspace.address = address;
      if (contactPhone) workspace.contactPhone = contactPhone;
      if (contactEmail) workspace.contactEmail = contactEmail;
      if (settings) {
        workspace.settings = {
          ...workspace.settings,
          ...settings,
        };
      }

      await workspace.save();

      res.status(200).json({
        success: true,
        message: 'Workspace settings updated successfully.',
        data: workspace,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get Workspace Members
  getMembers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const members = await WorkspaceMembership.find({
        workspaceId: req.workspaceId,
      })
        .populate('userId', 'fullName email mobile barCouncilNumber status')
        .sort({ createdAt: 1 });

      res.status(200).json({
        success: true,
        data: members.map((m) => ({
          membershipId: m._id,
          user: m.userId,
          role: m.role,
          permissions: m.permissions,
          status: m.status,
          joinedAt: m.joinedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  // Invite a Clerk / Staff member
  inviteMember: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, role, permissions } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user is already an active member of this workspace
      const existingMemberships = await WorkspaceMembership.find({
        workspaceId: req.workspaceId,
      }).populate('userId');

      const alreadyMember = existingMemberships.some(
        (m: any) => m.userId && m.userId.email === normalizedEmail && m.status === 'active'
      );

      if (alreadyMember) {
        res.status(409).json({
          success: false,
          message: 'This user is already an active member of your workspace.',
        });
        return;
      }

      // Check for existing pending invitation
      let invitation = await Invitation.findOne({
        workspaceId: req.workspaceId,
        email: normalizedEmail,
        status: 'pending',
      });

      const token = generateInvitationToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      if (invitation) {
        invitation.token = token;
        invitation.expiresAt = expiresAt;
        invitation.role = role || 'clerk';
        invitation.permissions = permissions || DEFAULT_CLERK_PERMISSIONS;
        await invitation.save();
      } else {
        invitation = await Invitation.create({
          workspaceId: req.workspaceId,
          invitedBy: req.user!._id,
          email: normalizedEmail,
          role: role || 'clerk',
          token,
          permissions: permissions || DEFAULT_CLERK_PERMISSIONS,
          expiresAt,
        });
      }

      const inviteUrl = `${ENV.APP_URL}/invite/accept?token=${token}`;

      // Log activity
      await ActivityLog.create({
        workspaceId: req.workspaceId,
        userId: req.user!._id,
        action: 'INVITATION_ISSUED',
        resourceType: 'Invitation',
        resourceId: invitation._id,
        details: { email: normalizedEmail, role: invitation.role },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Invitation generated successfully.',
        data: {
          invitationId: invitation._id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          inviteUrl,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // List Pending Invitations
  listInvitations: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invitations = await Invitation.find({
        workspaceId: req.workspaceId,
        status: 'pending',
      }).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: invitations,
      });
    } catch (error) {
      next(error);
    }
  },

  // Revoke Invitation
  revokeInvitation: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const invitation = await Invitation.findOne({
        _id: id,
        workspaceId: req.workspaceId,
      });

      if (!invitation) {
        res.status(404).json({ success: false, message: 'Invitation not found.' });
        return;
      }

      invitation.status = 'revoked';
      await invitation.save();

      res.status(200).json({
        success: true,
        message: 'Invitation revoked successfully.',
      });
    } catch (error) {
      next(error);
    }
  },

  // Update Member Status (Active/Suspended)
  updateMemberStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { memberId } = req.params;
      const { status } = req.body;

      if (!['active', 'suspended'].includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status. Must be active or suspended.' });
        return;
      }

      const membership = await WorkspaceMembership.findOne({
        _id: memberId,
        workspaceId: req.workspaceId,
      });

      if (!membership) {
        res.status(404).json({ success: false, message: 'Member not found.' });
        return;
      }

      if (membership.role === 'owner') {
        res.status(403).json({ success: false, message: 'Cannot suspend the workspace owner.' });
        return;
      }

      membership.status = status;
      await membership.save();

      res.status(200).json({
        success: true,
        message: `Member status updated to ${status}.`,
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  },
};

