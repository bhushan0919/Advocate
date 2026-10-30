import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IHearingCorrection {
  correctedBy: Types.ObjectId;
  correctedAt: Date;
  reason: string;
  previousValues: Record<string, any>;
}

export interface IHearing extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  caseId: Types.ObjectId;
  caseNumber?: string;
  clientName?: string;
  opponentName?: string;
  caseType?: string;
  hearingDate: Date;
  courtName: string;
  courtRoom?: string;
  purpose: string;
  proceedings: string;
  nextHearingDate?: Date;
  nextHearingPurpose?: string;
  additionalRemarks?: string;
  associatedOrderUrl?: string;
  createdBy: Types.ObjectId;
  recordedBy: Types.ObjectId;
  corrections: IHearingCorrection[];
  createdAt: Date;
  updatedAt: Date;
}

const HearingCorrectionSchema = new Schema<IHearingCorrection>(
  {
    correctedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    correctedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      required: [true, 'Correction reason is required'],
      trim: true,
    },
    previousValues: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false }
);

const HearingSchema = new Schema<IHearing>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
      required: [true, 'Case reference is required'],
      index: true,
    },
    caseNumber: {
      type: String,
      trim: true,
      default: '',
    },
    clientName: {
      type: String,
      trim: true,
      default: '',
    },
    opponentName: {
      type: String,
      trim: true,
      default: '',
    },
    caseType: {
      type: String,
      trim: true,
      default: 'Civil',
    },
    hearingDate: {
      type: Date,
      required: [true, 'Hearing date is required'],
      index: true,
    },
    courtName: {
      type: String,
      required: [true, 'Court name is required'],
      trim: true,
    },
    courtRoom: {
      type: String,
      trim: true,
      default: '',
    },
    purpose: {
      type: String,
      required: [true, 'Purpose of hearing is required'],
      trim: true,
    },
    proceedings: {
      type: String,
      required: [true, 'Daily proceedings are required'],
      trim: true,
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
    additionalRemarks: {
      type: String,
      default: '',
    },
    associatedOrderUrl: {
      type: String,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    corrections: {
      type: [HearingCorrectionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Required indexes:
// 1. workspaceId + hearingDate
HearingSchema.index({ workspaceId: 1, hearingDate: 1 });
// 2. workspaceId + caseId + hearingDate
HearingSchema.index({ workspaceId: 1, caseId: 1, hearingDate: -1 });
// 3. workspaceId + createdBy
HearingSchema.index({ workspaceId: 1, createdBy: 1 });
// 4. caseId + hearingDate
HearingSchema.index({ caseId: 1, hearingDate: -1 });
// Extra text/lookup indexes
HearingSchema.index({ workspaceId: 1, caseNumber: 1 });
HearingSchema.index({ workspaceId: 1, clientName: 1 });

export const Hearing = mongoose.model<IHearing>('Hearing', HearingSchema);
