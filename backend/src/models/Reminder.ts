import mongoose, { Document, Schema, Types } from 'mongoose';

export type ReminderType = 'hearing' | 'custom';
export type ReminderPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type ReminderStatus = 'Pending' | 'Completed' | 'Dismissed' | 'Snoozed';
export type ReminderInterval =
  | '1_day_before'
  | '3_days_before'
  | '7_days_before'
  | 'custom'
  | 'manual';

export interface IReminder extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  caseId?: Types.ObjectId;
  hearingId?: Types.ObjectId;
  title: string;
  description?: string;
  reminderType: ReminderType;
  intervalType?: ReminderInterval;
  hearingDate?: Date;
  reminderDate: Date;
  priority: ReminderPriority;
  assignedTo: Types.ObjectId;
  status: ReminderStatus;
  snoozedUntil?: Date;
  isNotified: boolean;
  notifiedAt?: Date;
  caseNumber?: string;
  clientName?: string;
  courtName?: string;
  hearingPurpose?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema = new Schema<IReminder>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace ID is required'],
      index: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
      index: true,
    },
    hearingId: {
      type: Schema.Types.ObjectId,
      ref: 'Hearing',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Reminder title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    reminderType: {
      type: String,
      enum: ['hearing', 'custom'],
      default: 'custom',
      index: true,
    },
    intervalType: {
      type: String,
      enum: ['1_day_before', '3_days_before', '7_days_before', 'custom', 'manual'],
      default: 'custom',
    },
    hearingDate: {
      type: Date,
    },
    reminderDate: {
      type: Date,
      required: [true, 'Reminder date/time is required'],
      index: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Dismissed', 'Snoozed'],
      default: 'Pending',
      index: true,
    },
    snoozedUntil: {
      type: Date,
    },
    isNotified: {
      type: Boolean,
      default: false,
      index: true,
    },
    notifiedAt: {
      type: Date,
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
    courtName: {
      type: String,
      trim: true,
      default: '',
    },
    hearingPurpose: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for fast workspace queries and background processing
ReminderSchema.index({ workspaceId: 1, status: 1, reminderDate: 1 });
ReminderSchema.index({ workspaceId: 1, assignedTo: 1, status: 1 });
ReminderSchema.index({ workspaceId: 1, caseId: 1, hearingDate: 1 });
ReminderSchema.index({ isNotified: 1, status: 1, reminderDate: 1 });

export const Reminder = mongoose.model<IReminder>('Reminder', ReminderSchema);

