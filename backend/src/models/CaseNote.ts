import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICaseNote extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  caseId: Types.ObjectId;
  content: string;
  authorId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CaseNoteSchema = new Schema<ICaseNote>(
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
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Note content cannot be empty'],
      trim: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

CaseNoteSchema.index({ workspaceId: 1, caseId: 1, createdAt: -1 });

export const CaseNote = mongoose.model<ICaseNote>('CaseNote', CaseNoteSchema);

