export interface CalendarEvent {
  _id: string;
  caseId: string;
  caseNumber: string;
  cnrNumber?: string;
  caseType: string;
  courtName: string;
  courtLocation?: string;
  courtRoom?: string;
  clientId?:
    | string
    | {
        _id: string;
        fullName: string;
        mobile?: string;
        email?: string;
        clientType?: string;
      };
  clientName: string;
  opponentName: string;
  opponentAdvocate?: string;
  filingDate?: string;
  previousHearingDate?: string;
  nextHearingDate: string;
  purpose: string;
  nextHearingPurpose?: string;
  status: string;
  assignedClerk?: {
    _id: string;
    fullName: string;
    email: string;
    mobile?: string;
  } | null;
  caseDescription?: string;
  isArchived: boolean;
  date: string; // YYYY-MM-DD in Asia/Kolkata
}

export interface CalendarEventsResponse {
  startDate: string;
  endDate: string;
  totalEvents: number;
  events: CalendarEvent[];
  eventsByDate: Record<string, CalendarEvent[]>;
}

export interface CalendarSummaryResponse {
  startDate: string;
  endDate: string;
  totalEvents: number;
  uniqueCourts: number;
  courts: string[];
  busiestDay: { date: string; count: number } | null;
  hearingsByCourt: Record<string, number>;
  hearingsByCaseType: Record<string, number>;
  hearingsByStatus: Record<string, number>;
  datesWithEvents: string[];
}

export interface CalendarDateDetailsResponse {
  date: string;
  totalHearings: number;
  cases: Array<{
    case: CalendarEvent;
    isCompleted: boolean;
    recordedHearing?: {
      caseId: string;
      proceedings: string;
      purpose: string;
      nextHearingDate?: string;
      nextHearingPurpose?: string;
      courtName?: string;
      courtRoom?: string;
    } | null;
  }>;
}

export interface CalendarFilterParams {
  startDate?: string;
  endDate?: string;
  court?: string;
  caseType?: string;
  status?: string;
  client?: string;
  opponent?: string;
  clerkId?: string;
  search?: string;
  includeArchived?: boolean;
}

