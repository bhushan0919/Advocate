import mongoose, { Document, Schema, Types } from 'mongoose';

export type WorkspaceRole = 'owner' | 'advocate' | 'clerk';

export interface IWorkspaceMembership extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  role: WorkspaceRole;
  permissions: string[];
  status: 'active' | 'suspended';
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_CLERK_PERMISSIONS = [
  'cases:read',
  'cases:write',
  'clients:read',
  'hearings:read',
  'hearings:write',
  'documents:read',
  'documents:write',
  'tasks:read',
  'tasks:write',
  'diary:read',
  'diary:write',
];

const WorkspaceMembershipSchema = new Schema<IWorkspaceMembership>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'advocate', 'clerk'],
      required: true,
      default: 'clerk',
    },
    permissions: {
      type: [String],
      default: function (this: IWorkspaceMembership) {
        if (this.role === 'owner') return ['*'];
        if (this.role === 'advocate') return ['*'];
        return DEFAULT_CLERK_PERMISSIONS;
      },
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate membership for the same user in the same workspace
WorkspaceMembershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export const WorkspaceMembership = mongoose.model<IWorkspaceMembership>(
  'WorkspaceMembership',
  WorkspaceMembershipSchema
);

