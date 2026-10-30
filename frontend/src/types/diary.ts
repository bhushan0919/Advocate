import { CaseRecord } from './case.ts';
import { HearingRecord } from './hearing.ts';

export interface DiaryEntry {
  case: CaseRecord;
  todayHearing: HearingRecord | null;
  isCompleted: boolean;
  courtName: string;
  courtRoom: string;
  scheduledPurpose: string;
  proceedings: string;
  nextHearingDate?: string;
  nextHearingPurpose?: string;
}

export interface DiaryResponse {
  date: string;
  cases: DiaryEntry[];
  total: number;
}

export interface DiarySummaryResponse {
  date: string;
  totalHearings: number;
  pendingUpdates: number;
  completedUpdates: number;
  uniqueCourts: number;
  courts: string[];
}

