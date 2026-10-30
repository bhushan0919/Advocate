import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: Types.ObjectId;
        id: string;
        email: string;
        fullName: string;
        role: string;
      };
      workspaceId?: Types.ObjectId;
      workspaceMembership?: {
        _id: Types.ObjectId;
        workspaceId: Types.ObjectId;
        role: 'owner' | 'advocate' | 'clerk';
        permissions: string[];
      };
    }
  }
}

export {};

