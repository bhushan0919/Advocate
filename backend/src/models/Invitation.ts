import mongoose, { Document, Schema, Types } from 'mongoose';
import { WorkspaceRole } from './WorkspaceMembership.js';

export interface IInvitation extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  invitedBy: Types.ObjectId;
  email: string;
  role: WorkspaceRole;
  token: string;
  permissions: string[];
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['clerk', 'advocate'],
      default: 'clerk',
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'revoked'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
InvitationSchema.index({ workspaceId: 1, email: 1, status: 1 });

export const Invitation = mongoose.model<IInvitation>('Invitation', InvitationSchema);

