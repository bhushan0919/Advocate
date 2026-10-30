export type CaseStatus = 'Pending' | 'Disposed' | 'Transferred' | 'Withdrawn' | 'Stayed';
export type CaseType = 'Civil' | 'Criminal' | 'Family' | 'Property' | 'Consumer' | 'Labour' | 'Other';

export interface CaseClientRef {
  _id: string;
  fullName: string;
  mobile: string;
  email?: string;
  clientType?: string;
  address?: string;
}

export interface CaseClerkRef {
  _id: string;
  fullName: string;
  email: string;
  mobile?: string;
}

export interface CaseRecord {
  _id: string;
  workspaceId: string;
  caseNumber: string;
  cnrNumber?: string;
  caseType: CaseType;
  courtName: string;
  courtLocation?: string;
  courtRoomNumber?: string;
  clientId: CaseClientRef | string;
  clientName?: string;
  opponentName: string;
  opponentAdvocate?: string;
  filingDate?: string;
  previousHearingDate?: string;
  nextHearingDate?: string;
  nextHearingPurpose?: string;
  status: CaseStatus;
  assignedClerkId?: CaseClerkRef | string;
  caseDescription?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CaseFormData {
  caseNumber: string;
  cnrNumber?: string;
  caseType: CaseType;
  courtName: string;
  courtLocation?: string;
  courtRoomNumber?: string;
  clientId: string;
  opponentName: string;
  opponentAdvocate?: string;
  filingDate?: string;
  previousHearingDate?: string;
  nextHearingDate?: string;
  nextHearingPurpose?: string;
  status: CaseStatus;
  assignedClerkId?: string;
  caseDescription?: string;
}

export interface CaseListResponse {
  cases: CaseRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

