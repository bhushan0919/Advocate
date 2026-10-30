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
  | 'Court Order'
  | 'Petition'
  | 'Application'
  | 'Notice'
  | 'Agreement'
  | 'Other';

export interface DocumentRecord {
  _id: string;
  workspaceId: string;
  caseId?: {
    _id: string;
    caseNumber: string;
    courtName?: string;
    courtRoomNumber?: string;
    clientName?: string;
    opponentName?: string;
    caseType?: string;
    status?: string;
  };
  clientId?: {
    _id: string;
    fullName: string;
    mobile?: string;
    email?: string;
    address?: string;
  };
  title: string;
  description?: string;
  category: DocumentCategory;
  storageKey: string;
  storedFileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  storageProvider: 'local' | 's3';
  uploadedBy: {
    _id: string;
    fullName: string;
    email: string;
    designation?: string;
    avatar?: string;
  };
  visibility: 'workspace' | 'private';
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFilterParams {
  search?: string;
  category?: string;
  fileType?: string;
  caseId?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentListResponse {
  documents: DocumentRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

