import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWorkspaceSettings {
  timezone: string;
  dateFormat: string;
  caseTypes: string[];
  caseStatuses: string[];
  reminderDaysBefore: number[];
}

export interface IWorkspace extends Document {
  _id: Types.ObjectId;
  name: string;
  ownerId: Types.ObjectId;
  barCouncilNumber?: string;
  stateBarCouncil?: string;
  officeName?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  logo?: string;
  settings: IWorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [120, 'Workspace name cannot exceed 120 characters'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Workspace owner is required'],
      index: true,
    },
    barCouncilNumber: {
      type: String,
      trim: true,
      default: '',
    },
    stateBarCouncil: {
      type: String,
      trim: true,
      default: '',
    },
    officeName: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
      default: '',
    },
    settings: {
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },
      dateFormat: {
        type: String,
        default: 'DD/MM/YYYY',
      },
      caseTypes: {
        type: [String],
        default: ['Civil', 'Criminal', 'Family', 'Property', 'Consumer', 'Labour', 'Other'],
      },
      caseStatuses: {
        type: [String],
        default: ['Pending', 'Disposed', 'Transferred', 'Withdrawn', 'Stayed'],
      },
      reminderDaysBefore: {
        type: [Number],
        default: [1, 3],
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Workspace = mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);

