import mongoose, { Document as MDocument, Schema, Types } from 'mongoose';

export type DocumentCategory =
  | 'Case Documents'
  | 'Court Orders'
  | 'Judgments'
  | 'Petitions'
  | 'Applications'
  | 'Affidavits'
  | 'Notices'
  | 'Evidence'
  | 'Agreements'
  | 'Legal Notices'
  | 'Client Documents'
  | 'Identity Documents'
  | 'Other Documents'
  // Backward compatibility aliases
  | 'Court Order'
  | 'Petition'
  | 'Application'
  | 'Notice'
  | 'Agreement'
  | 'Other';

export interface IDocument extends MDocument {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  caseId?: Types.ObjectId;
  clientId?: Types.ObjectId;
  title: string;
  description?: string;
  category: DocumentCategory;
  storageKey: string;
  storedFileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  storageProvider: 'local' | 's3';
  uploadedBy: Types.ObjectId;
  visibility: 'workspace' | 'private';
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
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
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      enum: [
        'Case Documents',
        'Court Orders',
        'Judgments',
        'Petitions',
        'Applications',
        'Affidavits',
        'Notices',
        'Evidence',
        'Agreements',
        'Legal Notices',
        'Client Documents',
        'Identity Documents',
        'Other Documents',
        // Legacy support
        'Court Order',
        'Petition',
        'Application',
        'Notice',
        'Agreement',
        'Other',
      ],
      default: 'Case Documents',
      index: true,
    },
    storageKey: {
      type: String,
      required: true,
      index: true,
    },
    storedFileName: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      index: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    storageProvider: {
      type: String,
      enum: ['local', 's3'],
      default: 'local',
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    visibility: {
      type: String,
      enum: ['workspace', 'private'],
      default: 'workspace',
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

DocumentSchema.index({ workspaceId: 1, caseId: 1, isArchived: 1 });
DocumentSchema.index({ workspaceId: 1, clientId: 1, isArchived: 1 });
DocumentSchema.index({ workspaceId: 1, category: 1, isArchived: 1 });
DocumentSchema.index({ workspaceId: 1, createdAt: -1 });

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
