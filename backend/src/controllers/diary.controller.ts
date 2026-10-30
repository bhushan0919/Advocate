import { Request, Response, NextFunction } from 'express';
import { Case } from '../models/Case.js';
import { Hearing } from '../models/Hearing.js';
import { getCalendarDayRange, formatDateOnly } from '../utils/date.js';

export const diaryController = {
  // GET /api/diary?date=YYYY-MM-DD
  getDailyDiary: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const dateParam = (req.query.date as string) || formatDateOnly(new Date());
      const dayRange = getCalendarDayRange(dateParam);

      // 1. Fetch cases scheduled for this hearing date
      const scheduledCases = await Case.find({
        workspaceId,
        nextHearingDate: dayRange,
        isArchived: { $ne: true },
      })
        .populate('clientId', 'fullName mobile email clientType')
        .populate('assignedClerkId', 'fullName email mobile');

      // 2. Also fetch any cases that had a hearing recorded on this date
      // (Even if their nextHearingDate was already updated to a future date)
      const recordedHearings = await Hearing.find({
        workspaceId,
        hearingDate: dayRange,
      }).populate('createdBy', 'fullName email');

      const recordedCaseIds = recordedHearings.map((h) => h.caseId.toString());

      // Fetch cases from recorded hearings that might not be in scheduledCases
      const existingScheduledIds = new Set(scheduledCases.map((c) => c._id.toString()));
      const missingCaseIds = recordedCaseIds.filter((id) => !existingScheduledIds.has(id));

      let additionalCases: any[] = [];
      if (missingCaseIds.length > 0) {
        additionalCases = await Case.find({
          _id: { $in: missingCaseIds },
          workspaceId,
        })
          .populate('clientId', 'fullName mobile email clientType')
          .populate('assignedClerkId', 'fullName email mobile');
      }

      const allRelevantCases = [...scheduledCases, ...additionalCases];

      // Map hearings to cases for this date
      const hearingByCaseId = new Map<string, any>();
      recordedHearings.forEach((h) => {
        hearingByCaseId.set(h.caseId.toString(), h);
      });

      // Construct diary entries
      const diaryEntries = allRelevantCases.map((c) => {
        const hearing = hearingByCaseId.get(c._id.toString()) || null;
        const isCompleted = !!hearing;

        return {
          case: c,
          todayHearing: hearing,
          isCompleted,
          courtName: hearing?.courtName || c.courtName,
          courtRoom: hearing?.courtRoom || c.courtRoomNumber || '',
          scheduledPurpose: hearing?.purpose || c.nextHearingPurpose || 'Hearing',
          proceedings: hearing?.proceedings || '',
          nextHearingDate: hearing?.nextHearingDate || c.nextHearingDate,
          nextHearingPurpose: hearing?.nextHearingPurpose || c.nextHearingPurpose || '',
        };
      });

      // Sort by courtName ascending, secondary by caseNumber
      diaryEntries.sort((a, b) => {
        const courtCompare = (a.courtName || '').localeCompare(b.courtName || '');
        if (courtCompare !== 0) return courtCompare;
        return (a.case.caseNumber || '').localeCompare(b.case.caseNumber || '');
      });

      res.status(200).json({
        success: true,
        data: {
          date: dateParam,
          cases: diaryEntries,
          total: diaryEntries.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/diary/summary?date=YYYY-MM-DD
  getDiarySummary: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const dateParam = (req.query.date as string) || formatDateOnly(new Date());
      const dayRange = getCalendarDayRange(dateParam);

      // Cases scheduled for this date
      const scheduledCases = await Case.find({
        workspaceId,
        nextHearingDate: dayRange,
        isArchived: { $ne: true },
      }).select('_id courtName nextHearingPurpose');

      // Hearings recorded on this date
      const recordedHearings = await Hearing.find({
        workspaceId,
        hearingDate: dayRange,
      }).select('caseId courtName proceedings');

      const scheduledIdSet = new Set(scheduledCases.map((c) => c._id.toString()));
      const recordedCaseIdSet = new Set(recordedHearings.map((h) => h.caseId.toString()));

      // Union of all case IDs active for this day
      const allActiveCaseIds = new Set([...scheduledIdSet, ...recordedCaseIdSet]);
      const totalHearings = allActiveCaseIds.size;

      // Completed updates are cases with a recorded hearing on this day
      const completedUpdates = recordedHearings.length;

      // Pending are cases scheduled for today that don't have a recorded hearing yet
      let pendingUpdates = 0;
      scheduledCases.forEach((c) => {
        if (!recordedCaseIdSet.has(c._id.toString())) {
          pendingUpdates++;
        }
      });

      // Unique courts scheduled
      const courtsSet = new Set<string>();
      scheduledCases.forEach((c) => {
        if (c.courtName) courtsSet.add(c.courtName.trim());
      });
      recordedHearings.forEach((h) => {
        if (h.courtName) courtsSet.add(h.courtName.trim());
      });

      const courtsList = Array.from(courtsSet).sort();

      res.status(200).json({
        success: true,
        data: {
          date: dateParam,
          totalHearings,
          pendingUpdates,
          completedUpdates,
          uniqueCourts: courtsList.length,
          courts: courtsList,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

