import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationType =
  | 'upcoming_hearing'
  | 'hearing_rescheduled'
  | 'hearing_cancelled'
  | 'task_assigned'
  | 'task_deadline_approaching'
  | 'task_overdue'
  | 'clerk_invitation_accepted'
  | 'workspace_activity'
  | 'custom_reminder';

export type NotificationPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface INotification extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  caseId?: Types.ObjectId;
  hearingId?: Types.ObjectId;
  taskId?: Types.ObjectId;
  reminderId?: Types.ObjectId;
  actionUrl?: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
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
      required: [true, 'User recipient ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: [
        'upcoming_hearing',
        'hearing_rescheduled',
        'hearing_cancelled',
        'task_assigned',
        'task_deadline_approaching',
        'task_overdue',
        'clerk_invitation_accepted',
        'workspace_activity',
        'custom_reminder',
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
    },
    hearingId: {
      type: Schema.Types.ObjectId,
      ref: 'Hearing',
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    reminderId: {
      type: Schema.Types.ObjectId,
      ref: 'Reminder',
    },
    actionUrl: {
      type: String,
      trim: true,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for user notification center and unread badge count
NotificationSchema.index({ workspaceId: 1, userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ workspaceId: 1, userId: 1, createdAt: -1 });
NotificationSchema.index({ workspaceId: 1, type: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

