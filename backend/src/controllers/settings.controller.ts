import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMembership } from '../models/WorkspaceMembership.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Case } from '../models/Case.js';
import { Client } from '../models/Client.js';
import { Hearing } from '../models/Hearing.js';
import { Task } from '../models/Task.js';
import { Reminder } from '../models/Reminder.js';
import { hashToken } from '../utils/jwt.js';
import { CloudinaryService } from '../services/cloudinary.service.js';

// Schemas
export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters')
      .optional(),
    mobile: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]{7,20}$/, 'Please provide a valid phone number')
      .optional(),
    designation: z.string().trim().max(100).optional(),
    barCouncilNumber: z.string().trim().max(100).optional(),
    stateBarCouncil: z.string().trim().max(150).optional(),
    officeAddress: z.string().trim().max(300).optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  }),
});

export const updatePreferencesSchema = z.object({
  body: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    timezone: z.string().min(2).optional(),
    dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
    timeFormat: z.enum(['12-hour', '24-hour']).optional(),
    language: z.string().min(2).max(10).optional(),
  }),
});

export const updateWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Chamber name is required').max(120).optional(),
    officeName: z.string().trim().max(150).optional(),
    address: z.string().trim().max(300).optional(),
    contactEmail: z.string().email('Valid contact email is required').optional().or(z.literal('')),
    contactPhone: z.string().trim().optional(),
    barCouncilNumber: z.string().trim().optional(),
    stateBarCouncil: z.string().trim().optional(),
    reminderDaysBefore: z.array(z.number()).optional(),
  }),
});

// Helper: Parse user-agent string into a friendly browser & OS label
const parseUserAgent = (ua: string): string => {
  if (!ua) return 'Unknown Device';
  let browser = 'Web Browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Google Chrome';
  else if (ua.includes('Edg')) browser = 'Microsoft Edge';
  else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Apple Safari';

  let os = 'Unknown OS';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS') || ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return `${browser} on ${os}`;
};

export const settingsController = {
  // --------------------------------------------------------------------------
  // 1. My Profile
  // --------------------------------------------------------------------------
  getProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await User.findById(req.user!._id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          avatar: user.avatar || '',
          profilePicture: user.profilePicture || user.avatar || '',
          designation: user.designation || '',
          officeAddress: user.officeAddress || '',
          barCouncilNumber: user.barCouncilNumber || '',
          stateBarCouncil: user.stateBarCouncil || '',
          systemRole: user.systemRole,
          status: user.status,
          roleInWorkspace: req.workspaceMembership?.role || 'advocate',
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  updateProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = updateProfileSchema.safeParse(req);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: parsed.error.errors[0].message,
          errors: parsed.error.errors,
        });
        return;
      }

      const { fullName, mobile, designation, barCouncilNumber, stateBarCouncil, officeAddress } =
        parsed.data.body;

      const user = await User.findById(req.user!._id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      if (fullName !== undefined) user.fullName = fullName;
      if (mobile !== undefined) user.mobile = mobile;
      if (designation !== undefined) user.designation = designation;
      if (barCouncilNumber !== undefined) user.barCouncilNumber = barCouncilNumber;
      if (stateBarCouncil !== undefined) user.stateBarCouncil = stateBarCouncil;
      if (officeAddress !== undefined) user.officeAddress = officeAddress;

      await user.save();

      // Log activity
      await ActivityLog.create({
        workspaceId: req.workspaceId!,
        userId: user._id,
        action: 'PROFILE_UPDATED',
        resourceType: 'User',
        resourceId: user._id,
        details: { fullName: user.fullName, designation: user.designation },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          avatar: user.avatar || '',
          profilePicture: user.profilePicture || user.avatar || '',
          designation: user.designation || '',
          officeAddress: user.officeAddress || '',
          barCouncilNumber: user.barCouncilNumber || '',
          stateBarCouncil: user.stateBarCouncil || '',
        },
      });
    } catch (error) {
      next(error);
    }
  },

  updateAvatar: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await User.findById(req.user!._id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      let uploadResult: { secureUrl: string; publicId: string };

      if (req.file) {
        // Upload from Multer memory buffer
        uploadResult = await CloudinaryService.uploadProfilePicture(
          req.file.buffer,
          user._id.toString(),
          req.file.mimetype
        );
      } else if (req.body?.avatar && typeof req.body.avatar === 'string') {
        const { avatar } = req.body;
        // Check size limit (max 5MB equivalent in base64 length)
        if (avatar.length > 7 * 1024 * 1024) {
          res.status(400).json({ success: false, message: 'Image size exceeds maximum 5MB limit.' });
          return;
        }

        uploadResult = await CloudinaryService.uploadBase64(avatar, user._id.toString());
      } else {
        res.status(400).json({
          success: false,
          message: 'Please provide an image file or valid image data for avatar upload.',
        });
        return;
      }

      // Store previous Cloudinary public ID for cleanup after successful database update
      const previousPublicId = user.avatarPublicId || user.profilePicturePublicId;

      try {
        user.avatar = uploadResult.secureUrl;
        user.avatarPublicId = uploadResult.publicId;
        user.profilePicture = uploadResult.secureUrl;
        user.profilePicturePublicId = uploadResult.publicId;
        await user.save();
      } catch (dbError) {
        // Rollback / clean up newly uploaded Cloudinary image if DB persistence fails
        await CloudinaryService.deleteImage(uploadResult.publicId);
        throw dbError;
      }

      // Clean up previous image in Cloudinary if one existed
      if (previousPublicId && previousPublicId !== uploadResult.publicId) {
        await CloudinaryService.deleteImage(previousPublicId);
      }

      res.status(200).json({
        success: true,
        message: 'Profile photo uploaded successfully to Cloudinary.',
        data: {
          avatar: user.avatar,
          profilePicture: user.profilePicture,
          publicId: user.avatarPublicId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  deleteAvatar: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await User.findById(req.user!._id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const publicIdToDelete = user.avatarPublicId || user.profilePicturePublicId;
      if (publicIdToDelete) {
        await CloudinaryService.deleteImage(publicIdToDelete);
      }

      user.avatar = '';
      user.avatarPublicId = '';
      user.profilePicture = '';
      user.profilePicturePublicId = '';
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Profile photo removed from Cloudinary.',
        data: {
          avatar: '',
          profilePicture: '',
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 2. Account Settings
  // --------------------------------------------------------------------------
  getAccount: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await User.findById(req.user!._id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          email: user.email,
          mobile: user.mobile,
          isEmailVerified: user.isEmailVerified,
          status: user.status,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  changePassword: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = changePasswordSchema.safeParse(req);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: parsed.error.errors[0].message,
          errors: parsed.error.errors,
        });
        return;
      }

      const { currentPassword, newPassword, confirmPassword } = parsed.data.body;

      if (newPassword !== confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'New password and confirmation do not match.',
        });
        return;
      }

      const user = await User.findById(req.user!._id).select('+passwordHash');
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const isCurrentValid = await user.comparePassword(currentPassword);
      if (!isCurrentValid) {
        res.status(400).json({
          success: false,
          message: 'Current password provided is incorrect.',
        });
        return;
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      await user.save();

      // Revoke all existing sessions for security
      await RefreshToken.updateMany(
        { userId: user._id, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );

      // Log activity
      await ActivityLog.create({
        workspaceId: req.workspaceId!,
        userId: user._id,
        action: 'PASSWORD_CHANGED',
        resourceType: 'User',
        resourceId: user._id,
        details: { ip: req.ip },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Other active sessions have been revoked.',
      });
    } catch (error) {
      next(error);
    }
  },

  updateMobile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mobile } = req.body;
      if (!mobile || !/^[0-9+\-\s()]{7,20}$/.test(mobile.trim())) {
        res.status(400).json({ success: false, message: 'Please provide a valid mobile number.' });
        return;
      }

      const user = await User.findById(req.user!._id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      user.mobile = mobile.trim();
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Mobile number updated successfully.',
        data: { mobile: user.mobile },
      });
    } catch (error) {
      next(error);
    }
  },

  deactivateAccount: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, confirmationText } = req.body;

      if (confirmationText !== 'DEACTIVATE') {
        res.status(400).json({
          success: false,
          message: 'Please type DEACTIVATE in capital letters to confirm account deactivation.',
        });
        return;
      }

      const user = await User.findById(req.user!._id).select('+passwordHash');
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const isCurrentValid = await user.comparePassword(currentPassword || '');
      if (!isCurrentValid) {
        res.status(400).json({
          success: false,
          message: 'Current password provided is incorrect.',
        });
        return;
      }

      // Check if user is sole owner of active workspace with other members
      const ownedWorkspaces = await Workspace.find({ ownerId: user._id });
      for (const ws of ownedWorkspaces) {
        const otherMembers = await WorkspaceMembership.countDocuments({
          workspaceId: ws._id,
          userId: { $ne: user._id },
          status: 'active',
        });
        if (otherMembers > 0) {
          res.status(400).json({
            success: false,
            message: `Cannot deactivate account: You are the primary owner of "${ws.name}" which has ${otherMembers} other active member(s). Transfer ownership first.`,
          });
          return;
        }
      }

      // Deactivate account (never delete legal cases or hearings!)
      user.status = 'deactivated';
      await user.save();

      // Invalidate all tokens
      await RefreshToken.updateMany(
        { userId: user._id, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );

      // Log activity
      await ActivityLog.create({
        workspaceId: req.workspaceId!,
        userId: user._id,
        action: 'ACCOUNT_DEACTIVATED',
        resourceType: 'User',
        resourceId: user._id,
        details: { note: 'User self-deactivated. Legal case records preserved.' },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Account has been deactivated. Legal court records remain securely preserved.',
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 3. Workspace Settings (Advocate / Owner Only)
  // --------------------------------------------------------------------------
  getWorkspaceSettings: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const workspace = await Workspace.findById(workspaceId).populate('ownerId', 'fullName email mobile');

      if (!workspace) {
        res.status(404).json({ success: false, message: 'Workspace not found.' });
        return;
      }

      // Get members of this workspace
      const memberships = await WorkspaceMembership.find({ workspaceId, status: 'active' }).populate(
        'userId',
        'fullName email mobile designation avatar'
      );

      res.status(200).json({
        success: true,
        data: {
          id: workspace._id,
          name: workspace.name,
          officeName: workspace.officeName || '',
          address: workspace.address || '',
          contactEmail: workspace.contactEmail || '',
          contactPhone: workspace.contactPhone || '',
          barCouncilNumber: workspace.barCouncilNumber || '',
          stateBarCouncil: workspace.stateBarCouncil || '',
          logo: workspace.logo || '',
          settings: workspace.settings,
          owner: workspace.ownerId,
          createdAt: workspace.createdAt,
          userRole: req.workspaceMembership?.role,
          membersCount: memberships.length,
          members: memberships.map((m) => ({
            id: m._id,
            user: m.userId,
            role: m.role,
            joinedAt: m.createdAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  updateWorkspaceSettings: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Role enforcement: Clerks cannot modify workspace settings
      if (req.workspaceMembership?.role !== 'owner' && req.workspaceMembership?.role !== 'advocate') {
        res.status(403).json({
          success: false,
          message: 'Permission denied: Only chamber owners and advocates can modify workspace settings.',
        });
        return;
      }

      const parsed = updateWorkspaceSchema.safeParse(req);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: parsed.error.errors[0].message,
          errors: parsed.error.errors,
        });
        return;
      }

      const workspaceId = req.workspaceId!;
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        res.status(404).json({ success: false, message: 'Workspace not found.' });
        return;
      }

      const {
        name,
        officeName,
        address,
        contactEmail,
        contactPhone,
        barCouncilNumber,
        stateBarCouncil,
        reminderDaysBefore,
      } = parsed.data.body;

      if (name !== undefined) workspace.name = name;
      if (officeName !== undefined) workspace.officeName = officeName;
      if (address !== undefined) workspace.address = address;
      if (contactEmail !== undefined) workspace.contactEmail = contactEmail;
      if (contactPhone !== undefined) workspace.contactPhone = contactPhone;
      if (barCouncilNumber !== undefined) workspace.barCouncilNumber = barCouncilNumber;
      if (stateBarCouncil !== undefined) workspace.stateBarCouncil = stateBarCouncil;
      if (reminderDaysBefore !== undefined) {
        workspace.settings.reminderDaysBefore = reminderDaysBefore;
      }

      await workspace.save();

      // Log activity
      await ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: 'WORKSPACE_SETTINGS_UPDATED',
        resourceType: 'Workspace',
        resourceId: workspace._id,
        details: { name: workspace.name, officeName: workspace.officeName },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Chamber workspace settings updated successfully.',
        data: workspace,
      });
    } catch (error) {
      next(error);
    }
  },

  updateWorkspaceLogo: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.workspaceMembership?.role !== 'owner' && req.workspaceMembership?.role !== 'advocate') {
        res.status(403).json({
          success: false,
          message: 'Permission denied: Only chamber owners and advocates can modify chamber branding.',
        });
        return;
      }

      const { logo } = req.body;
      if (!logo || typeof logo !== 'string') {
        res.status(400).json({ success: false, message: 'Valid logo image is required.' });
        return;
      }

      if (logo.length > 4 * 1024 * 1024) {
        res.status(400).json({ success: false, message: 'Logo size exceeds maximum 3MB limit.' });
        return;
      }

      const workspace = await Workspace.findById(req.workspaceId!);
      if (!workspace) {
        res.status(404).json({ success: false, message: 'Workspace not found.' });
        return;
      }

      workspace.logo = logo;
      await workspace.save();

      res.status(200).json({
        success: true,
        message: 'Workspace logo updated successfully.',
        data: { logo: workspace.logo },
      });
    } catch (error) {
      next(error);
    }
  },

  deleteWorkspaceLogo: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.workspaceMembership?.role !== 'owner' && req.workspaceMembership?.role !== 'advocate') {
        res.status(403).json({
          success: false,
          message: 'Permission denied: Only chamber owners and advocates can remove chamber branding.',
        });
        return;
      }

      const workspace = await Workspace.findById(req.workspaceId!);
      if (!workspace) {
        res.status(404).json({ success: false, message: 'Workspace not found.' });
        return;
      }

      workspace.logo = '';
      await workspace.save();

      res.status(200).json({
        success: true,
        message: 'Workspace logo removed.',
        data: { logo: '' },
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 4. Preferences (Appearance & Regional)
  // --------------------------------------------------------------------------
  getPreferences: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await User.findById(req.user!._id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const prefs = user.preferences || {
        theme: 'light',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12-hour',
        language: 'en',
      };

      res.status(200).json({
        success: true,
        data: prefs,
      });
    } catch (error) {
      next(error);
    }
  },

  updatePreferences: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = updatePreferencesSchema.safeParse(req);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: parsed.error.errors[0].message,
          errors: parsed.error.errors,
        });
        return;
      }

      const user = await User.findById(req.user!._id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const { theme, timezone, dateFormat, timeFormat, language } = parsed.data.body;

      if (!user.preferences) {
        user.preferences = {
          theme: 'light',
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12-hour',
          language: 'en',
        };
      }

      if (theme) user.preferences.theme = theme;
      if (timezone) user.preferences.timezone = timezone;
      if (dateFormat) user.preferences.dateFormat = dateFormat;
      if (timeFormat) user.preferences.timeFormat = timeFormat;
      if (language) user.preferences.language = language;

      await user.save();

      res.status(200).json({
        success: true,
        message: 'Preferences updated successfully.',
        data: user.preferences,
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 5. Security & Audit Logs
  // --------------------------------------------------------------------------
  getSecurityInfo: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await User.findById(req.user!._id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      // Fetch recent security activities
      const recentLogs = await ActivityLog.find({
        userId: user._id,
        action: {
          $in: [
            'LOGIN_SUCCESS',
            'PASSWORD_CHANGED',
            'PROFILE_UPDATED',
            'SESSION_REVOKED',
            'ACCOUNT_DEACTIVATED',
            'WORKSPACE_INITIALIZED',
          ],
        },
      })
        .sort({ createdAt: -1 })
        .limit(10);

      const activeSessionsCount = await RefreshToken.countDocuments({
        userId: user._id,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      });

      res.status(200).json({
        success: true,
        data: {
          lastLoginAt: user.lastLoginAt,
          accountCreated: user.createdAt,
          activeSessionsCount,
          recentLogs,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 6. Session Management
  // --------------------------------------------------------------------------
  getSessions: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!._id;
      const currentToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];
      const currentHash = currentToken ? hashToken(currentToken) : null;

      const sessions = await RefreshToken.find({
        userId,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }).sort({ lastActiveAt: -1, createdAt: -1 });

      const mappedSessions = sessions.map((s) => ({
        id: s._id,
        ipAddress: s.createdByIp || '127.0.0.1',
        device: parseUserAgent(s.userAgent || ''),
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt || s.createdAt,
        expiresAt: s.expiresAt,
        isCurrent: currentHash ? s.tokenHash === currentHash : false,
      }));

      // If no token matched isCurrent, mark the top one as current
      if (mappedSessions.length > 0 && !mappedSessions.some((s) => s.isCurrent)) {
        mappedSessions[0].isCurrent = true;
      }

      res.status(200).json({
        success: true,
        data: {
          total: mappedSessions.length,
          sessions: mappedSessions,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  revokeSession: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid session ID format.' });
        return;
      }

      const session = await RefreshToken.findOne({ _id: id, userId });
      if (!session) {
        res.status(404).json({ success: false, message: 'Active session not found.' });
        return;
      }

      session.revokedAt = new Date();
      await session.save();

      // Log activity
      await ActivityLog.create({
        workspaceId: req.workspaceId!,
        userId,
        action: 'SESSION_REVOKED',
        resourceType: 'RefreshToken',
        resourceId: session._id,
        details: { ip: session.createdByIp },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Session has been revoked successfully.',
      });
    } catch (error) {
      next(error);
    }
  },

  revokeOtherSessions: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!._id;
      const currentToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];
      const currentHash = currentToken ? hashToken(currentToken) : null;

      const query: any = {
        userId,
        revokedAt: null,
      };

      if (currentHash) {
        query.tokenHash = { $ne: currentHash };
      } else {
        // Keep most recently active session
        const latest = await RefreshToken.findOne({ userId, revokedAt: null }).sort({
          lastActiveAt: -1,
        });
        if (latest) {
          query._id = { $ne: latest._id };
        }
      }

      const result = await RefreshToken.updateMany(query, { $set: { revokedAt: new Date() } });

      res.status(200).json({
        success: true,
        message: `Revoked ${result.modifiedCount} other active session(s).`,
        data: { revokedCount: result.modifiedCount },
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 7. Data & Privacy
  // --------------------------------------------------------------------------
  getDataSummary: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;

      const [
        activeCases,
        archivedCases,
        totalClients,
        totalHearings,
        totalTasks,
        totalReminders,
        totalMembers,
      ] = await Promise.all([
        Case.countDocuments({ workspaceId, isArchived: { $ne: true } }),
        Case.countDocuments({ workspaceId, isArchived: true }),
        Client.countDocuments({ workspaceId }),
        Hearing.countDocuments({ workspaceId }),
        Task.countDocuments({ workspaceId }),
        Reminder.countDocuments({ workspaceId }),
        WorkspaceMembership.countDocuments({ workspaceId, status: 'active' }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          activeCases,
          archivedCases,
          totalCases: activeCases + archivedCases,
          totalClients,
          totalHearings,
          totalTasks,
          totalReminders,
          totalMembers,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  exportWorkspaceData: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Clerks restricted from bulk chamber data export
      if (req.workspaceMembership?.role !== 'owner' && req.workspaceMembership?.role !== 'advocate') {
        res.status(403).json({
          success: false,
          message: 'Permission denied: Only advocates and chamber owners can export workspace data.',
        });
        return;
      }

      const workspaceId = req.workspaceId!;
      const workspace = await Workspace.findById(workspaceId).select('name officeName createdAt');

      const [cases, clients, hearings, tasks, reminders] = await Promise.all([
        Case.find({ workspaceId }).select('-__v'),
        Client.find({ workspaceId }).select('-__v'),
        Hearing.find({ workspaceId }).select('-__v'),
        Task.find({ workspaceId }).select('-__v'),
        Reminder.find({ workspaceId }).select('-__v'),
      ]);

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        chamber: {
          id: workspaceId,
          name: workspace?.name,
          officeName: workspace?.officeName,
        },
        counts: {
          cases: cases.length,
          clients: clients.length,
          hearings: hearings.length,
          tasks: tasks.length,
          reminders: reminders.length,
        },
        data: {
          cases,
          clients,
          hearings,
          tasks,
          reminders,
        },
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="advd-chamber-export-${Date.now()}.json"`
      );

      res.status(200).json({
        success: true,
        message: 'Chamber data exported successfully.',
        data: exportPayload,
      });
    } catch (error) {
      next(error);
    }
  },
};

