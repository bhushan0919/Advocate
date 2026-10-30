import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IClient extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  fullName: string;
  mobile: string;
  email?: string;
  address?: string;
  clientType: 'Individual' | 'Corporate' | 'Government' | 'Other';
  notes?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      index: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    clientType: {
      type: String,
      enum: ['Individual', 'Corporate', 'Government', 'Other'],
      default: 'Individual',
    },
    notes: {
      type: String,
      default: '',
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ClientSchema.index({ workspaceId: 1, fullName: 1 });
ClientSchema.index({ workspaceId: 1, mobile: 1 });
ClientSchema.index({ workspaceId: 1, email: 1 });
ClientSchema.index({ workspaceId: 1, isArchived: 1 });

export const Client = mongoose.model<IClient>('Client', ClientSchema);

