import mongoose, { Document, Schema, Types } from 'mongoose';

export type CaseStatus = 'Pending' | 'Disposed' | 'Transferred' | 'Withdrawn' | 'Stayed';
export type CaseType = 'Civil' | 'Criminal' | 'Family' | 'Property' | 'Consumer' | 'Labour' | 'Other';

export interface ICase extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  caseNumber: string;
  cnrNumber?: string;
  caseType: CaseType;
  courtName: string;
  courtLocation?: string;
  courtRoomNumber?: string;
  clientId: Types.ObjectId;
  clientName?: string;
  opponentName: string;
  opponentAdvocate?: string;
  filingDate?: Date;
  previousHearingDate?: Date;
  nextHearingDate?: Date;
  nextHearingPurpose?: string;
  status: CaseStatus;
  assignedClerkId?: Types.ObjectId;
  caseDescription?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CaseSchema = new Schema<ICase>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    caseNumber: {
      type: String,
      required: [true, 'Case number is required'],
      trim: true,
    },
    cnrNumber: {
      type: String,
      trim: true,
      default: '',
    },
    caseType: {
      type: String,
      required: true,
      default: 'Civil',
    },
    courtName: {
      type: String,
      required: [true, 'Court name is required'],
      trim: true,
    },
    courtLocation: {
      type: String,
      trim: true,
      default: '',
    },
    courtRoomNumber: {
      type: String,
      trim: true,
      default: '',
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
      index: true,
    },
    clientName: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    opponentName: {
      type: String,
      required: [true, 'Opponent name is required'],
      trim: true,
    },
    opponentAdvocate: {
      type: String,
      trim: true,
      default: '',
    },
    filingDate: {
      type: Date,
    },
    previousHearingDate: {
      type: Date,
    },
    nextHearingDate: {
      type: Date,
      index: true,
    },
    nextHearingPurpose: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Disposed', 'Transferred', 'Withdrawn', 'Stayed'],
      default: 'Pending',
      index: true,
    },
    assignedClerkId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    caseDescription: {
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

// Compound Unique Index: Unique caseNumber per workspace
CaseSchema.index({ workspaceId: 1, caseNumber: 1 }, { unique: true });
CaseSchema.index({ workspaceId: 1, nextHearingDate: 1 });
CaseSchema.index({ workspaceId: 1, status: 1 });
CaseSchema.index({ workspaceId: 1, clientId: 1 });
CaseSchema.index({ workspaceId: 1, clientName: 1 });
CaseSchema.index({ workspaceId: 1, opponentName: 1 });
CaseSchema.index({ workspaceId: 1, cnrNumber: 1 });
CaseSchema.index({ workspaceId: 1, isArchived: 1 });

export const Case = mongoose.model<ICase>('Case', CaseSchema);

