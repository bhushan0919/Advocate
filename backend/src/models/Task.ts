import mongoose, { Document, Schema, Types } from 'mongoose';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'Pending' | 'To Do' | 'In Progress' | 'Completed' | 'Cancelled';

export interface ITaskComment {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  comment: string;
  createdAt: Date;
}

export interface ITask extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  caseId?: Types.ObjectId;
  caseNumber?: string;
  clientName?: string;
  title: string;
  description?: string;
  assignedTo: Types.ObjectId;
  priority: TaskPriority;
  dueDate: Date;
  status: TaskStatus;
  comments: ITaskComment[];
  completedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskCommentSchema = new Schema<ITaskComment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const TaskSchema = new Schema<ITask>(
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
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'To Do', 'In Progress', 'Completed', 'Cancelled'],
      default: 'To Do',
      index: true,
    },
    comments: {
      type: [TaskCommentSchema],
      default: [],
    },
    completedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

TaskSchema.index({ workspaceId: 1, status: 1, dueDate: 1 });
TaskSchema.index({ workspaceId: 1, assignedTo: 1, status: 1 });
TaskSchema.index({ workspaceId: 1, createdBy: 1 });
TaskSchema.index({ workspaceId: 1, caseId: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
