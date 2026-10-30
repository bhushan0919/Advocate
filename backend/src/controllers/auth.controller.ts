import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMembership, DEFAULT_CLERK_PERMISSIONS } from '../models/WorkspaceMembership.js';
import { Invitation } from '../models/Invitation.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ActivityLog } from '../models/ActivityLog.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import { runInTransaction } from '../utils/transaction.js';

// Validation Schemas
export const registerAdvocateSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    mobile: z.string().min(10, 'Mobile number must be at least 10 digits'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    barCouncilNumber: z.string().optional(),
    stateBarCouncil: z.string().optional(),
    officeName: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    workspaceId: z.string().optional(),
  }),
});

export const acceptInvitationSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Invitation token is required'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    mobile: z.string().min(10, 'Mobile number must be at least 10 digits'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

export const authController = {
  // Advocate Registration -> Creates User + Workspace + Owner Membership
  registerAdvocate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        fullName,
        email,
        mobile,
        password,
        barCouncilNumber,
        stateBarCouncil,
        officeName,
      } = req.body;

      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'An account with this email address already exists. Please sign in.',
        });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const result = await runInTransaction(async (session) => {
        const sessionOpt = session ? { session } : undefined;

        // 1. Create User
        const [newUser] = await User.create(
          [
            {
              fullName: fullName.trim(),
              email: normalizedEmail,
              mobile: mobile.trim(),
              passwordHash,
              barCouncilNumber: barCouncilNumber?.trim() || '',
              stateBarCouncil: stateBarCouncil?.trim() || '',
              isEmailVerified: true,
              status: 'active',
            },
          ],
          sessionOpt
        );

        // 2. Create Workspace
        const workspaceName = officeName?.trim() || `Chambers of Adv. ${fullName.trim()}`;
        const [newWorkspace] = await Workspace.create(
          [
            {
              name: workspaceName,
              ownerId: newUser._id,
              barCouncilNumber: barCouncilNumber?.trim() || '',
              stateBarCouncil: stateBarCouncil?.trim() || '',
              officeName: officeName?.trim() || '',
              contactEmail: normalizedEmail,
              contactPhone: mobile.trim(),
            },
          ],
          sessionOpt
        );

        // 3. Create Owner Membership
        const [membership] = await WorkspaceMembership.create(
          [
            {
              workspaceId: newWorkspace._id,
              userId: newUser._id,
              role: 'owner',
              permissions: ['*'],
              status: 'active',
            },
          ],
          sessionOpt
        );

        // Generate tokens
        const accessToken = generateAccessToken({
          userId: newUser._id.toString(),
          email: newUser.email,
          workspaceId: newWorkspace._id.toString(),
          role: 'owner',
        });

        const { token: refreshToken, hash: refreshHash } = generateRefreshToken({
          userId: newUser._id.toString(),
        });

        await RefreshToken.create(
          [
            {
              userId: newUser._id,
              tokenHash: refreshHash,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdByIp: req.ip || '',
              userAgent: (req.headers['user-agent'] as string) || '',
              lastActiveAt: new Date(),
            },
          ],
          sessionOpt
        );

        await ActivityLog.create(
          [
            {
              workspaceId: newWorkspace._id,
              userId: newUser._id,
              action: 'WORKSPACE_INITIALIZED',
              resourceType: 'Workspace',
              resourceId: newWorkspace._id,
              details: { name: workspaceName, owner: fullName },
              ipAddress: req.ip,
            },
          ],
          sessionOpt
        );

        return {
          user: {
            id: newUser._id,
            fullName: newUser.fullName,
            email: newUser.email,
            mobile: newUser.mobile,
            barCouncilNumber: newUser.barCouncilNumber,
            stateBarCouncil: newUser.stateBarCouncil,
          },
          workspace: {
            id: newWorkspace._id,
            name: newWorkspace.name,
            role: membership.role,
            permissions: membership.permissions,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        };
      });

      res.status(201).json({
        success: true,
        message: 'Advocate registered successfully and workspace provisioned.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  // User Login (Advocate or Clerk)
  login: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, workspaceId } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials.',
        });
        return;
      }

      if (user.status !== 'active') {
        res.status(403).json({
          success: false,
          message: 'Your account is suspended. Please contact your administrator.',
        });
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials.',
        });
        return;
      }

      const memberships = await WorkspaceMembership.find({
        userId: user._id,
        status: 'active',
      }).populate('workspaceId', 'name ownerId barCouncilNumber officeName');

      if (memberships.length === 0) {
        res.status(403).json({
          success: false,
          message: 'You have no active workspace memberships. Please ask an advocate to invite you.',
        });
        return;
      }

      let targetMembership = memberships[0];
      if (workspaceId) {
        const found = memberships.find((m) => m.workspaceId._id.toString() === workspaceId);
        if (found) {
          targetMembership = found;
        }
      } else {
        const ownerM = memberships.find((m) => m.role === 'owner');
        if (ownerM) targetMembership = ownerM;
      }

      const activeWorkspace = targetMembership.workspaceId as any;

      const accessToken = generateAccessToken({
        userId: user._id.toString(),
        email: user.email,
        workspaceId: activeWorkspace._id.toString(),
        role: targetMembership.role,
      });

      const { token: refreshToken, hash: refreshHash } = generateRefreshToken({
        userId: user._id.toString(),
      });

      await RefreshToken.create({
        userId: user._id,
        tokenHash: refreshHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdByIp: req.ip || '',
        userAgent: (req.headers['user-agent'] as string) || '',
        lastActiveAt: new Date(),
      });

      user.lastLoginAt = new Date();
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            mobile: user.mobile,
            avatar: user.avatar || '',
            profilePicture: user.profilePicture || user.avatar || '',
            designation: user.designation || '',
            officeAddress: user.officeAddress || '',
            barCouncilNumber: user.barCouncilNumber,
            stateBarCouncil: user.stateBarCouncil,
            preferences: user.preferences,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
          },
          workspace: {
            id: activeWorkspace._id,
            name: activeWorkspace.name,
            role: targetMembership.role,
            permissions: targetMembership.permissions,
          },
          availableWorkspaces: memberships.map((m) => ({
            id: (m.workspaceId as any)._id,
            name: (m.workspaceId as any).name,
            role: m.role,
          })),
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Refresh Token
  refreshToken: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required.',
        });
        return;
      }

      let decoded: { userId: string };
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token.',
        });
        return;
      }

      const incomingHash = hashToken(refreshToken);
      const storedToken = await RefreshToken.findOne({
        tokenHash: incomingHash,
        userId: decoded.userId,
        revokedAt: null,
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        res.status(401).json({
          success: false,
          message: 'Refresh token has been revoked or expired.',
        });
        return;
      }

      storedToken.revokedAt = new Date();
      await storedToken.save();

      const user = await User.findById(decoded.userId);
      if (!user || user.status !== 'active') {
        res.status(401).json({
          success: false,
          message: 'User account inactive or not found.',
        });
        return;
      }

      const membership = await WorkspaceMembership.findOne({
        userId: user._id,
        status: 'active',
      });

      const newAccessToken = generateAccessToken({
        userId: user._id.toString(),
        email: user.email,
        workspaceId: membership?.workspaceId.toString(),
        role: membership?.role,
      });

      const { token: newRefreshToken, hash: newRefreshHash } = generateRefreshToken({
        userId: user._id.toString(),
      });

      await RefreshToken.create({
        userId: user._id,
        tokenHash: newRefreshHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdByIp: req.ip || '',
        userAgent: (req.headers['user-agent'] as string) || '',
        lastActiveAt: new Date(),
      });

      res.status(200).json({
        success: true,
        message: 'Tokens refreshed successfully.',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Logout
  logout: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        const hash = hashToken(refreshToken);
        await RefreshToken.updateOne({ tokenHash: hash }, { revokedAt: new Date() });
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully.',
      });
    } catch (error) {
      next(error);
    }
  },

  // Get Current Authenticated Profile and Workspace
  getMe: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated.' });
        return;
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const memberships = await WorkspaceMembership.find({
        userId: user._id,
        status: 'active',
      }).populate('workspaceId');

      let currentMembership = null;
      if (req.workspaceId) {
        currentMembership = memberships.find(
          (m) => (m.workspaceId as any)?._id.toString() === req.workspaceId?.toString()
        );
      }
      if (!currentMembership && memberships.length > 0) {
        currentMembership = memberships[0];
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            mobile: user.mobile,
            avatar: user.avatar || '',
            profilePicture: user.profilePicture || user.avatar || '',
            designation: user.designation || '',
            officeAddress: user.officeAddress || '',
            barCouncilNumber: user.barCouncilNumber,
            stateBarCouncil: user.stateBarCouncil,
            preferences: user.preferences,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
          },
          currentWorkspace: currentMembership
            ? {
                id: (currentMembership.workspaceId as any)._id,
                name: (currentMembership.workspaceId as any).name,
                role: currentMembership.role,
                permissions: currentMembership.permissions,
                settings: (currentMembership.workspaceId as any).settings,
              }
            : null,
          memberships: memberships.map((m) => ({
            id: (m.workspaceId as any)._id,
            name: (m.workspaceId as any).name,
            role: m.role,
            permissions: m.permissions,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Verify Clerk Invitation Token
  verifyInvitation: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Invitation token is required.',
        });
        return;
      }

      const invitation = await Invitation.findOne({ token, status: 'pending' })
        .populate('workspaceId', 'name officeName')
        .populate('invitedBy', 'fullName email');

      if (!invitation) {
        res.status(404).json({
          success: false,
          message: 'Invitation not found or has already been used.',
        });
        return;
      }

      if (invitation.expiresAt < new Date()) {
        invitation.status = 'expired';
        await invitation.save();
        res.status(410).json({
          success: false,
          message: 'This invitation has expired. Please ask the advocate for a new invite.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          email: invitation.email,
          role: invitation.role,
          workspace: {
            id: (invitation.workspaceId as any)._id,
            name: (invitation.workspaceId as any).name,
          },
          invitedBy: {
            name: (invitation.invitedBy as any).fullName,
          },
          expiresAt: invitation.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Accept Clerk Invitation & Create/Link Account (WITHOUT CREATING WORKSPACE)
  acceptInvitation: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, fullName, mobile, password } = req.body;

      const invitation = await Invitation.findOne({ token, status: 'pending' });
      if (!invitation) {
        res.status(404).json({
          success: false,
          message: 'Invalid or already used invitation.',
        });
        return;
      }

      if (invitation.expiresAt < new Date()) {
        invitation.status = 'expired';
        await invitation.save();
        res.status(410).json({
          success: false,
          message: 'This invitation has expired.',
        });
        return;
      }

      const email = invitation.email.toLowerCase().trim();

      const result = await runInTransaction(async (session) => {
        const sessionOpt = session ? { session } : undefined;

        let user = await User.findOne({ email }, null, sessionOpt);

        if (!user) {
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(password, salt);

          const [newUser] = await User.create(
            [
              {
                fullName: fullName.trim(),
                email,
                mobile: mobile.trim(),
                passwordHash,
                isEmailVerified: true,
                status: 'active',
              },
            ],
            sessionOpt
          );
          user = newUser;
        }

        const existingMembership = await WorkspaceMembership.findOne(
          {
            workspaceId: invitation.workspaceId,
            userId: user._id,
          },
          null,
          sessionOpt
        );

        if (existingMembership) {
          existingMembership.status = 'active';
          existingMembership.role = invitation.role;
          existingMembership.permissions =
            invitation.permissions.length > 0
              ? invitation.permissions
              : DEFAULT_CLERK_PERMISSIONS;
          await existingMembership.save(sessionOpt);
        } else {
          await WorkspaceMembership.create(
            [
              {
                workspaceId: invitation.workspaceId,
                userId: user._id,
                role: invitation.role,
                permissions:
                  invitation.permissions.length > 0
                    ? invitation.permissions
                    : DEFAULT_CLERK_PERMISSIONS,
                status: 'active',
              },
            ],
            sessionOpt
          );
        }

        invitation.status = 'accepted';
        await invitation.save(sessionOpt);

        const workspace = await Workspace.findById(invitation.workspaceId, null, sessionOpt);

        const accessToken = generateAccessToken({
          userId: user._id.toString(),
          email: user.email,
          workspaceId: invitation.workspaceId.toString(),
          role: invitation.role,
        });

        const { token: refreshToken, hash: refreshHash } = generateRefreshToken({
          userId: user._id.toString(),
        });

        await RefreshToken.create(
          [
            {
              userId: user._id,
              tokenHash: refreshHash,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdByIp: req.ip || '',
            },
          ],
          sessionOpt
        );

        await ActivityLog.create(
          [
            {
              workspaceId: invitation.workspaceId,
              userId: user._id,
              action: 'CLERK_JOINED',
              resourceType: 'WorkspaceMembership',
              resourceId: user._id,
              details: { name: user.fullName, email: user.email, role: invitation.role },
              ipAddress: req.ip,
            },
          ],
          sessionOpt
        );

        return {
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            mobile: user.mobile,
          },
          workspace: {
            id: workspace?._id,
            name: workspace?.name,
            role: invitation.role,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        };
      });

      res.status(200).json({
        success: true,
        message: 'Invitation accepted! You have joined the workspace as a clerk.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
