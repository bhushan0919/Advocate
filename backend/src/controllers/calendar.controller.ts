import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Case } from '../models/Case.js';
import { Hearing } from '../models/Hearing.js';
import {
  getCalendarDayRange,
  getDateRangeFilter,
  formatDateOnly,
} from '../utils/date.js';

function getDefaultMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    startDate: formatDateOnly(start) || `${year}-${String(month + 1).padStart(2, '0')}-01`,
    endDate: formatDateOnly(end) || `${year}-${String(month + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
  };
}

function buildCalendarFilter(req: Request, startDateStr: string, endDateStr: string): any {
  const workspaceId = req.workspaceId;
  const dateRange = getDateRangeFilter(startDateStr, endDateStr);

  const filter: any = {
    workspaceId,
    nextHearingDate: {
      $gte: dateRange.$gte,
      $lte: dateRange.$lte,
    },
  };

  // Archived filter: exclude archived unless explicitly requested
  if (req.query.includeArchived === 'true') {
    // include both
  } else {
    filter.isArchived = { $ne: true };
  }

  // Status filter: exclude Disposed by default from upcoming calendar events
  if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
  } else if (!req.query.status) {
    filter.status = { $ne: 'Disposed' };
  }

  // Court filter
  if (req.query.court && typeof req.query.court === 'string') {
    filter.courtName = { $regex: req.query.court.trim(), $options: 'i' };
  }

  // Case type filter
  if (req.query.caseType && typeof req.query.caseType === 'string' && req.query.caseType !== 'all') {
    filter.caseType = req.query.caseType.trim();
  }

  // Client filter
  if (req.query.client && typeof req.query.client === 'string') {
    filter.clientName = { $regex: req.query.client.trim(), $options: 'i' };
  }

  // Opponent filter
  if (req.query.opponent && typeof req.query.opponent === 'string') {
    filter.opponentName = { $regex: req.query.opponent.trim(), $options: 'i' };
  }

  // Clerk filter
  if (req.query.clerkId && typeof req.query.clerkId === 'string' && Types.ObjectId.isValid(req.query.clerkId)) {
    filter.assignedClerkId = new Types.ObjectId(req.query.clerkId);
  }

  // General search
  if (req.query.search && typeof req.query.search === 'string') {
    const term = req.query.search.trim();
    if (term) {
      filter.$or = [
        { caseNumber: { $regex: term, $options: 'i' } },
        { clientName: { $regex: term, $options: 'i' } },
        { opponentName: { $regex: term, $options: 'i' } },
        { courtName: { $regex: term, $options: 'i' } },
        { cnrNumber: { $regex: term, $options: 'i' } },
        { nextHearingPurpose: { $regex: term, $options: 'i' } },
      ];
    }
  }

  return filter;
}

export const calendarController = {
  // GET /api/calendar?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  getCalendarEvents: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const defaults = getDefaultMonthRange();
      const startDate = (req.query.startDate as string) || defaults.startDate;
      const endDate = (req.query.endDate as string) || defaults.endDate;

      const filter = buildCalendarFilter(req, startDate, endDate);

      const cases = await Case.find(filter)
        .populate('clientId', 'fullName mobile email clientType')
        .populate('assignedClerkId', 'fullName email mobile')
        .sort({ nextHearingDate: 1, courtName: 1, caseNumber: 1 });

      const events = cases.map((c) => {
        const clientObj = typeof c.clientId === 'object' && c.clientId !== null ? (c.clientId as any) : null;
        const clerkObj = typeof c.assignedClerkId === 'object' && c.assignedClerkId !== null ? (c.assignedClerkId as any) : null;
        const dateStr = formatDateOnly(c.nextHearingDate);

        return {
          _id: c._id,
          caseId: c._id,
          caseNumber: c.caseNumber,
          cnrNumber: c.cnrNumber || '',
          caseType: c.caseType,
          courtName: c.courtName,
          courtLocation: c.courtLocation || '',
          courtRoom: c.courtRoomNumber || '',
          clientId: c.clientId,
          clientName: c.clientName || clientObj?.fullName || '',
          opponentName: c.opponentName,
          opponentAdvocate: c.opponentAdvocate || '',
          filingDate: c.filingDate,
          previousHearingDate: c.previousHearingDate,
          nextHearingDate: c.nextHearingDate,
          purpose: c.nextHearingPurpose || 'Hearing',
          nextHearingPurpose: c.nextHearingPurpose || 'Hearing',
          status: c.status,
          assignedClerk: clerkObj,
          caseDescription: c.caseDescription || '',
          isArchived: c.isArchived,
          date: dateStr,
        };
      });

      // Group events by date string (YYYY-MM-DD)
      const eventsByDate: Record<string, typeof events> = {};
      events.forEach((ev) => {
        if (!eventsByDate[ev.date]) {
          eventsByDate[ev.date] = [];
        }
        eventsByDate[ev.date].push(ev);
      });

      res.status(200).json({
        success: true,
        data: {
          startDate,
          endDate,
          totalEvents: events.length,
          events,
          eventsByDate,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/calendar/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  getCalendarSummary: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const defaults = getDefaultMonthRange();
      const startDate = (req.query.startDate as string) || defaults.startDate;
      const endDate = (req.query.endDate as string) || defaults.endDate;

      const filter = buildCalendarFilter(req, startDate, endDate);

      const cases = await Case.find(filter).select(
        '_id courtName caseType status nextHearingDate'
      );

      const hearingsByCourt: Record<string, number> = {};
      const hearingsByCaseType: Record<string, number> = {};
      const hearingsByStatus: Record<string, number> = {};
      const dateCountMap: Record<string, number> = {};
      const courtsSet = new Set<string>();

      cases.forEach((c) => {
        const court = (c.courtName || 'Unspecified').trim();
        courtsSet.add(court);
        hearingsByCourt[court] = (hearingsByCourt[court] || 0) + 1;

        const cType = c.caseType || 'Other';
        hearingsByCaseType[cType] = (hearingsByCaseType[cType] || 0) + 1;

        const stat = c.status || 'Pending';
        hearingsByStatus[stat] = (hearingsByStatus[stat] || 0) + 1;

        const dateStr = formatDateOnly(c.nextHearingDate);
        if (dateStr) {
          dateCountMap[dateStr] = (dateCountMap[dateStr] || 0) + 1;
        }
      });

      // Find busiest day
      let busiestDay: { date: string; count: number } | null = null;
      Object.entries(dateCountMap).forEach(([date, count]) => {
        if (!busiestDay || count > busiestDay.count) {
          busiestDay = { date, count };
        }
      });

      const datesWithEvents = Object.keys(dateCountMap).sort();
      const uniqueCourts = Array.from(courtsSet).sort();

      res.status(200).json({
        success: true,
        data: {
          startDate,
          endDate,
          totalEvents: cases.length,
          uniqueCourts: uniqueCourts.length,
          courts: uniqueCourts,
          busiestDay,
          hearingsByCourt,
          hearingsByCaseType,
          hearingsByStatus,
          datesWithEvents,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/calendar/date/:date
  getCalendarDateDetails: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const { date } = req.params;

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({
          success: false,
          message: 'Invalid date parameter. Required format is YYYY-MM-DD.',
        });
        return;
      }

      const dayRange = getCalendarDayRange(date);

      // Build day-scoped filter
      const filter: any = {
        workspaceId,
        nextHearingDate: dayRange,
        isArchived: { $ne: true },
      };

      if (req.query.status && req.query.status !== 'all') {
        filter.status = req.query.status;
      } else if (!req.query.status) {
        filter.status = { $ne: 'Disposed' };
      }

      if (req.query.court && typeof req.query.court === 'string') {
        filter.courtName = { $regex: req.query.court.trim(), $options: 'i' };
      }

      if (req.query.caseType && typeof req.query.caseType === 'string' && req.query.caseType !== 'all') {
        filter.caseType = req.query.caseType.trim();
      }

      const scheduledCases = await Case.find(filter)
        .populate('clientId', 'fullName mobile email clientType')
        .populate('assignedClerkId', 'fullName email mobile')
        .sort({ courtName: 1, caseNumber: 1 });

      // Check if any hearings were recorded on this date
      const recordedHearings = await Hearing.find({
        workspaceId,
        hearingDate: dayRange,
      }).select('caseId proceedings purpose nextHearingDate nextHearingPurpose courtName courtRoom');

      const hearingMap = new Map<string, any>();
      recordedHearings.forEach((h) => {
        hearingMap.set(h.caseId.toString(), h);
      });

      const formattedCases = scheduledCases.map((c) => {
        const recorded = hearingMap.get(c._id.toString()) || null;
        return {
          case: c,
          isCompleted: !!recorded,
          recordedHearing: recorded,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          date,
          totalHearings: formattedCases.length,
          cases: formattedCases,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

