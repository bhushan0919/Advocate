export interface HearingCorrection {
  correctedBy: {
    _id: string;
    fullName: string;
    email: string;
  };
  correctedAt: string;
  reason: string;
  previousValues: Record<string, any>;
}

export interface HearingRecord {
  _id: string;
  workspaceId: string;
  caseId:
    | string
    | {
        _id: string;
        caseNumber: string;
        caseType?: string;
        courtName?: string;
        courtRoomNumber?: string;
        status?: string;
      };
  caseNumber: string;
  clientName: string;
  opponentName: string;
  caseType?: string;
  hearingDate: string;
  courtName: string;
  courtRoom?: string;
  purpose: string;
  proceedings: string;
  nextHearingDate?: string;
  nextHearingPurpose?: string;
  additionalRemarks?: string;
  associatedOrderUrl?: string;
  createdBy: {
    _id: string;
    fullName: string;
    email: string;
    mobile?: string;
  };
  recordedBy?: {
    _id: string;
    fullName: string;
    email: string;
  };
  corrections: HearingCorrection[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateHearingPayload {
  hearingDate: string;
  purpose: string;
  proceedings: string;
  nextHearingDate: string;
  nextHearingPurpose: string;
  courtName?: string;
  courtRoom?: string;
  additionalRemarks?: string;
  associatedOrderUrl?: string;
}

export interface CorrectHearingPayload {
  reason: string;
  purpose?: string;
  proceedings?: string;
  nextHearingDate?: string;
  nextHearingPurpose?: string;
  courtName?: string;
  courtRoom?: string;
  additionalRemarks?: string;
}

export interface HearingListResponse {
  hearings: HearingRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

