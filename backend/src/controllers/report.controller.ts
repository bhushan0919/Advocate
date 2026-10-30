import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import { Case } from '../models/Case.js';
import { Hearing } from '../models/Hearing.js';
import { Task } from '../models/Task.js';
import { Client } from '../models/Client.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMembership } from '../models/WorkspaceMembership.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { PDFExportService } from '../services/pdf-export.service.js';
import { ExcelExportService } from '../services/excel-export.service.js';

export const reportController = {
  // --------------------------------------------------------------------------
  // 1. Overview Dashboard Analytics
  // --------------------------------------------------------------------------
  getOverview: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thirtyDaysAhead = new Date(startOfDay.getTime() + 30 * 24 * 60 * 60 * 1000);

      const [
        totalCases,
        activeCases,
        disposedCases,
        totalHearings,
        upcomingHearings30d,
        totalTasks,
        pendingTasks,
        overdueTasks,
        completedTasks,
        totalClients,
        totalMembers,
      ] = await Promise.all([
        Case.countDocuments({ workspaceId, isArchived: { $ne: true } }),
        Case.countDocuments({ workspaceId, status: { $ne: 'Disposed' }, isArchived: { $ne: true } }),
        Case.countDocuments({ workspaceId, status: 'Disposed', isArchived: { $ne: true } }),
        Hearing.countDocuments({ workspaceId }),
        Case.countDocuments({
          workspaceId,
          isArchived: { $ne: true },
          nextHearingDate: { $gte: startOfDay, $lte: thirtyDaysAhead },
        }),
        Task.countDocuments({ workspaceId }),
        Task.countDocuments({ workspaceId, status: { $in: ['pending', 'in_progress'] } }),
        Task.countDocuments({
          workspaceId,
          status: { $in: ['pending', 'in_progress'] },
          dueDate: { $lt: startOfDay },
        }),
        Task.countDocuments({ workspaceId, status: 'completed' }),
        Client.countDocuments({ workspaceId, isArchived: { $ne: true } }),
        WorkspaceMembership.countDocuments({ workspaceId, status: 'active' }),
      ]);

      // Last 6 months monthly hearing volume
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const monthlyHearings = await Hearing.aggregate([
        {
          $match: {
            workspaceId,
            hearingDate: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$hearingDate' },
              month: { $month: '$hearingDate' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyTrends = monthlyHearings.map((m) => ({
        label: `${monthNames[m._id.month - 1]} ${m._id.year}`,
        count: m.count,
      }));

      // Case status breakdown
      const statusCounts = await Case.aggregate([
        { $match: { workspaceId, isArchived: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      res.status(200).json({
        success: true,
        data: {
          cases: {
            total: totalCases,
            active: activeCases,
            disposed: disposedCases,
            statusBreakdown: statusCounts.map((s) => ({ status: s._id, count: s.count })),
          },
          hearings: {
            total: totalHearings,
            upcomingNext30Days: upcomingHearings30d,
            monthlyTrends,
          },
          tasks: {
            total: totalTasks,
            pending: pendingTasks,
            overdue: overdueTasks,
            completed: completedTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          },
          clients: {
            total: totalClients,
          },
          staff: {
            totalMembers,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 2. Case Reports & Case Analytics
  // --------------------------------------------------------------------------
  getCasesReport: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const { startDate, endDate, court, caseType, status } = req.query;

      const query: any = {
        workspaceId,
        isArchived: { $ne: true },
      };

      if (court && typeof court === 'string' && court.trim()) {
        query.courtName = new RegExp(court.trim(), 'i');
      }

      if (caseType && caseType !== 'All') {
        query.caseType = caseType;
      }

      if (status && status !== 'All') {
        query.status = status;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate as string);
        if (endDate) {
          const end = new Date(endDate as string);
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }

      const [casesByCourt, casesByType, casesByStatus, totalMatched, activeCount, disposedCount] =
        await Promise.all([
          Case.aggregate([
            { $match: query },
            { $group: { _id: '$courtName', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ]),
          Case.aggregate([
            { $match: query },
            { $group: { _id: '$caseType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
          Case.aggregate([
            { $match: query },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
          Case.countDocuments(query),
          Case.countDocuments({ ...query, status: { $ne: 'Disposed' } }),
          Case.countDocuments({ ...query, status: 'Disposed' }),
        ]);

      const recentCases = await Case.find(query)
        .populate('clientId', 'fullName mobile')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalCases: totalMatched,
            activeCases: activeCount,
            disposedCases: disposedCount,
          },
          casesByCourt: casesByCourt.map((c) => ({ court: c._id || 'Unspecified', count: c.count })),
          casesByCaseType: casesByType.map((t) => ({ caseType: t._id || 'Other', count: t.count })),
          casesByStatus: casesByStatus.map((s) => ({ status: s._id, count: s.count })),
          recentCases,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 3. Hearing Reports & Roster Analytics
  // --------------------------------------------------------------------------
  getHearingsReport: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const { startDate, endDate, court } = req.query;

      const query: any = { workspaceId };

      if (court && typeof court === 'string' && court.trim()) {
        query.courtName = new RegExp(court.trim(), 'i');
      }

      if (startDate || endDate) {
        query.hearingDate = {};
        if (startDate) query.hearingDate.$gte = new Date(startDate as string);
        if (endDate) {
          const end = new Date(endDate as string);
          end.setHours(23, 59, 59, 999);
          query.hearingDate.$lte = end;
        }
      }

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [totalHearings, conductedHearings, upcomingHearings, hearingsByCourt, hearingsByMonth] =
        await Promise.all([
          Hearing.countDocuments(query),
          Hearing.countDocuments({ ...query, hearingDate: { $lt: startOfToday } }),
          Case.countDocuments({
            workspaceId,
            isArchived: { $ne: true },
            status: { $ne: 'Disposed' },
            nextHearingDate: { $gte: startOfToday },
          }),
          Hearing.aggregate([
            { $match: query },
            { $group: { _id: '$courtName', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ]),
          Hearing.aggregate([
            { $match: query },
            {
              $group: {
                _id: {
                  year: { $year: '$hearingDate' },
                  month: { $month: '$hearingDate' },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
          ]),
        ]);

      // Active cases missing next hearing date
      const casesWithNoNextDate = await Case.find({
        workspaceId,
        isArchived: { $ne: true },
        status: { $ne: 'Disposed' },
        $or: [{ nextHearingDate: { $exists: false } }, { nextHearingDate: null }],
      })
        .select('caseNumber courtName clientName status previousHearingDate')
        .limit(20)
        .lean();

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyTrends = hearingsByMonth.map((m) => ({
        label: `${monthNames[m._id.month - 1]} ${m._id.year}`,
        count: m.count,
      }));

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalHearings,
            conductedHearings,
            upcomingHearings,
            casesMissingNextDateCount: casesWithNoNextDate.length,
          },
          hearingsByCourt: hearingsByCourt.map((c) => ({ court: c._id || 'Unspecified', count: c.count })),
          monthlyTrends,
          casesWithNoNextDate,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 4. Daily / Period Court Diary Report
  // --------------------------------------------------------------------------
  getDiaryReport: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const { date, startDate, endDate, court } = req.query;

      const query: any = {
        workspaceId,
        isArchived: { $ne: true },
        status: { $ne: 'Disposed' },
      };

      if (date && typeof date === 'string') {
        const targetDate = new Date(date);
        const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
        query.nextHearingDate = { $gte: start, $lte: end };
      } else if (startDate || endDate) {
        query.nextHearingDate = {};
        if (startDate) query.nextHearingDate.$gte = new Date(startDate as string);
        if (endDate) {
          const end = new Date(endDate as string);
          end.setHours(23, 59, 59, 999);
          query.nextHearingDate.$lte = end;
        }
      }

      if (court && typeof court === 'string' && court.trim()) {
        query.courtName = new RegExp(court.trim(), 'i');
      }

      const cases = await Case.find(query)
        .populate('clientId', 'fullName mobile')
        .sort({ courtName: 1, courtRoomNumber: 1, caseNumber: 1 })
        .lean();

      res.status(200).json({
        success: true,
        data: {
          totalScheduled: cases.length,
          cases,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 5. Task Reports & Productivity Analytics
  // --------------------------------------------------------------------------
  getTasksReport: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const { assignedTo, priority, status } = req.query;

      const query: any = { workspaceId };
      if (assignedTo && Types.ObjectId.isValid(assignedTo as string)) {
        query.assignedTo = new Types.ObjectId(assignedTo as string);
      }
      if (priority && priority !== 'All') {
        query.priority = priority;
      }
      if (status && status !== 'All') {
        query.status = status;
      }

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [totalTasks, pendingTasks, completedTasks, overdueTasks, tasksByPriority, tasksByClerk] =
        await Promise.all([
          Task.countDocuments(query),
          Task.countDocuments({ ...query, status: { $in: ['pending', 'in_progress'] } }),
          Task.countDocuments({ ...query, status: 'completed' }),
          Task.countDocuments({
            ...query,
            status: { $in: ['pending', 'in_progress'] },
            dueDate: { $lt: startOfToday },
          }),
          Task.aggregate([
            { $match: query },
            { $group: { _id: '$priority', count: { $sum: 1 } } },
          ]),
          Task.aggregate([
            { $match: { workspaceId } },
            {
              $group: {
                _id: '$assignedTo',
                total: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                pending: {
                  $sum: { $cond: [{ $in: ['$status', ['pending', 'in_progress']] }, 1, 0] },
                },
                overdue: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $in: ['$status', ['pending', 'in_progress']] },
                          { $lt: ['$dueDate', startOfToday] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user',
              },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          ]),
        ]);

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalTasks,
            pendingTasks,
            completedTasks,
            overdueTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          },
          tasksByPriority: tasksByPriority.map((p) => ({ priority: p._id, count: p.count })),
          staffWorkload: tasksByClerk.map((c) => ({
            userId: c._id,
            userName: c.user?.fullName || 'Unassigned',
            email: c.user?.email || '',
            total: c.total,
            completed: c.completed,
            pending: c.pending,
            overdue: c.overdue,
            rate: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 6. Client Analytics Report
  // --------------------------------------------------------------------------
  getClientsReport: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;

      const [totalClients, individualClients, corporateClients, governmentClients] =
        await Promise.all([
          Client.countDocuments({ workspaceId, isArchived: { $ne: true } }),
          Client.countDocuments({ workspaceId, clientType: 'Individual', isArchived: { $ne: true } }),
          Client.countDocuments({ workspaceId, clientType: 'Corporate', isArchived: { $ne: true } }),
          Client.countDocuments({ workspaceId, clientType: 'Government', isArchived: { $ne: true } }),
        ]);

      // Top clients by active case count
      const clientCaseCounts = await Case.aggregate([
        { $match: { workspaceId, isArchived: { $ne: true } } },
        {
          $group: {
            _id: '$clientId',
            totalCases: { $sum: 1 },
            activeCases: { $sum: { $cond: [{ $ne: ['$status', 'Disposed'] }, 1, 0] } },
            disposedCases: { $sum: { $cond: [{ $eq: ['$status', 'Disposed'] }, 1, 0] } },
          },
        },
        { $sort: { activeCases: -1, totalCases: -1 } },
        { $limit: 15 },
        {
          $lookup: {
            from: 'clients',
            localField: '_id',
            foreignField: '_id',
            as: 'client',
          },
        },
        { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
      ]);

      const clientsWithMultiple = clientCaseCounts.filter((c) => c.totalCases > 1).length;

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalClients,
            individualClients,
            corporateClients,
            governmentClients,
            clientsWithMultipleCases: clientsWithMultiple,
          },
          topClients: clientCaseCounts.map((c) => ({
            id: c._id,
            fullName: c.client?.fullName || 'Unknown Client',
            mobile: c.client?.mobile || '-',
            email: c.client?.email || '-',
            clientType: c.client?.clientType || 'Individual',
            totalCases: c.totalCases,
            activeCases: c.activeCases,
            disposedCases: c.disposedCases,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 7. Staff & Workspace Workload Report
  // --------------------------------------------------------------------------
  getStaffReport: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;

      const memberships = await WorkspaceMembership.find({ workspaceId, status: 'active' }).populate(
        'userId',
        'fullName email mobile designation avatar createdAt'
      );

      const staffStats = await Promise.all(
        memberships.map(async (m) => {
          const user = m.userId as any;
          if (!user) return null;

          const [assignedCases, totalTasks, completedTasks, pendingTasks] = await Promise.all([
            Case.countDocuments({
              workspaceId,
              assignedClerkId: user._id,
              isArchived: { $ne: true },
            }),
            Task.countDocuments({ workspaceId, assignedTo: user._id }),
            Task.countDocuments({ workspaceId, assignedTo: user._id, status: 'completed' }),
            Task.countDocuments({
              workspaceId,
              assignedTo: user._id,
              status: { $in: ['pending', 'in_progress'] },
            }),
          ]);

          return {
            id: m._id,
            userId: user._id,
            fullName: user.fullName,
            email: user.email,
            mobile: user.mobile,
            designation: user.designation || '',
            avatar: user.avatar || '',
            role: m.role,
            joinedAt: m.createdAt,
            assignedCases,
            totalTasks,
            completedTasks,
            pendingTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: {
          members: staffStats.filter(Boolean),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 8. PDF Export Handler
  // --------------------------------------------------------------------------
  exportPdf: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        res.status(404).json({ success: false, message: 'Workspace not found.' });
        return;
      }

      const { reportType = 'case-register', startDate, endDate, court, status, caseType, lang = 'en' } = req.query;
      const isMr = (lang as string) === 'mr';

      const mapStatus = (s: string) => {
        if (!isMr) return s;
        switch (s) {
          case 'Pending': return 'प्रलंबित';
          case 'Disposed': return 'निकाली';
          case 'Stayed': return 'स्थगिती';
          case 'Archived': return 'अभिलेखात';
          default: return s;
        }
      };

      const mapPriority = (p: string) => {
        if (!isMr) return p;
        switch (p?.toUpperCase()) {
          case 'LOW': return 'कमी';
          case 'MEDIUM': return 'मध्यम';
          case 'HIGH': return 'उच्च';
          case 'URGENT': return 'तातडीचे';
          default: return p;
        }
      };

      const mapTaskStatus = (s: string) => {
        if (!isMr) return s;
        switch (s?.toLowerCase()) {
          case 'pending': return 'प्रलंबित';
          case 'in_progress': return 'प्रगतीपथावर';
          case 'completed': return 'पूर्ण';
          case 'overdue': return 'मुदत संपलेले';
          default: return s;
        }
      };

      const mapClientType = (t: string) => {
        if (!isMr) return t;
        switch (t) {
          case 'Individual': return 'वैयक्तिक';
          case 'Corporate': return 'कंपनी / संस्था';
          case 'Government': return 'शासकीय';
          case 'Other': return 'इतर';
          default: return t;
        }
      };

      let reportTitle = isMr ? 'प्रकरण नोंदवही अहवाल' : 'Case Register Report';
      let columns: any[] = [];
      let dataRows: any[] = [];

      const query: any = { workspaceId, isArchived: { $ne: true } };
      if (court) query.courtName = new RegExp((court as string).trim(), 'i');
      if (status && status !== 'All') query.status = status;
      if (caseType && caseType !== 'All') query.caseType = caseType;

      if (reportType === 'case-register') {
        reportTitle = isMr ? 'कार्यालयीन प्रकरण नोंदवही अहवाल' : 'Chamber Case Register Report';
        columns = [
          { header: isMr ? 'प्रकरण क्रमांक' : 'Case Number', key: 'caseNumber', width: 110 },
          { header: isMr ? 'सी.एन.आर. क्र.' : 'CNR Number', key: 'cnrNumber', width: 130 },
          { header: isMr ? 'न्यायालयाचे नाव' : 'Court Name', key: 'courtName', width: 130 },
          { header: isMr ? 'प्रकरण प्रकार' : 'Case Type', key: 'caseType', width: 90 },
          { header: isMr ? 'पक्षकाराचे नाव' : 'Client Name', key: 'clientName', width: 120 },
          { header: isMr ? 'विरोधी पक्ष' : 'Opponent', key: 'opponentName', width: 120 },
          { header: isMr ? 'पुढील तारीख' : 'Next Date', key: 'nextHearingDate', width: 80 },
          { header: isMr ? 'स्थिती' : 'Status', key: 'status', width: 70 },
        ];

        const cases = await Case.find(query).sort({ caseNumber: 1 }).lean();
        dataRows = cases.map((c) => ({
          ...c,
          status: mapStatus(c.status),
          cnrNumber: c.cnrNumber || '-',
          nextHearingDate: c.nextHearingDate ? new Date(c.nextHearingDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN') : '-',
        }));
      } else if (reportType === 'daily-diary' || reportType === 'weekly-diary' || reportType === 'monthly-diary') {
        reportTitle = isMr
          ? reportType === 'daily-diary'
            ? 'दैनंदिन न्यायालयीन डायरी'
            : reportType === 'weekly-diary'
            ? 'साप्ताहिक न्यायालयीन डायरी'
            : 'मासिक न्यायालयीन डायरी'
          : reportType === 'daily-diary'
          ? 'Daily Court Diary'
          : reportType === 'weekly-diary'
          ? 'Weekly Court Diary'
          : 'Monthly Court Diary';

        columns = [
          { header: isMr ? 'प्रकरण क्रमांक' : 'Case Number', key: 'caseNumber', width: 110 },
          { header: isMr ? 'न्यायालय' : 'Court', key: 'courtName', width: 130 },
          { header: isMr ? 'कक्ष' : 'Room', key: 'courtRoomNumber', width: 60 },
          { header: isMr ? 'पक्षकार' : 'Client', key: 'clientName', width: 120 },
          { header: isMr ? 'विरोधी पक्ष' : 'Opponent', key: 'opponentName', width: 120 },
          { header: isMr ? 'सुनावणीचे कामकाज' : 'Purpose of Hearing', key: 'purpose', width: 140 },
          { header: isMr ? 'सुनावणी तारीख' : 'Hearing Date', key: 'hearingDate', width: 90 },
        ];

        if (startDate || endDate) {
          query.nextHearingDate = {};
          if (startDate) query.nextHearingDate.$gte = new Date(startDate as string);
          if (endDate) {
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
            query.nextHearingDate.$lte = end;
          }
        }

        const cases = await Case.find(query).sort({ nextHearingDate: 1, courtName: 1 }).lean();
        dataRows = cases.map((c) => ({
          ...c,
          courtRoomNumber: c.courtRoomNumber || '-',
          purpose: c.nextHearingPurpose || (isMr ? 'सुनावणी' : 'Hearing'),
          hearingDate: c.nextHearingDate ? new Date(c.nextHearingDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN') : '-',
        }));
      } else if (reportType === 'task-report') {
        reportTitle = isMr ? 'कार्यालयीन कामकाज व कृती अहवाल' : 'Chamber Task Assignment & Status Report';
        columns = [
          { header: isMr ? 'कामाचे नाव' : 'Task Title', key: 'title', width: 180 },
          { header: isMr ? 'प्राधान्य' : 'Priority', key: 'priority', width: 80 },
          { header: isMr ? 'स्थिती' : 'Status', key: 'status', width: 90 },
          { header: isMr ? 'नेमलेली व्यक्ती' : 'Assigned To', key: 'assignedName', width: 130 },
          { header: isMr ? 'अंतिम मुदत' : 'Due Date', key: 'dueDate', width: 90 },
        ];

        const tasks = await Task.find({ workspaceId }).populate('assignedTo', 'fullName').sort({ dueDate: 1 }).lean();
        dataRows = tasks.map((t) => ({
          ...t,
          assignedName: (t.assignedTo as any)?.fullName || (isMr ? 'अनियुक्त' : 'Unassigned'),
          dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN') : '-',
          status: mapTaskStatus(t.status),
          priority: mapPriority(t.priority),
        }));
      } else if (reportType === 'client-report') {
        reportTitle = isMr ? 'पक्षकार नोंदवही व संपर्क अहवाल' : 'Client Directory & Registry Report';
        columns = [
          { header: isMr ? 'पक्षकाराचे नाव' : 'Client Name', key: 'fullName', width: 160 },
          { header: isMr ? 'भ्रमणध्वनी' : 'Mobile Number', key: 'mobile', width: 120 },
          { header: isMr ? 'ईमेल पत्ता' : 'Email Address', key: 'email', width: 150 },
          { header: isMr ? 'पक्षकार वर्ग' : 'Client Category', key: 'clientType', width: 100 },
          { header: isMr ? 'नोंदणी तारीख' : 'Registered On', key: 'createdAt', width: 90 },
        ];

        const clients = await Client.find({ workspaceId, isArchived: { $ne: true } }).sort({ fullName: 1 }).lean();
        dataRows = clients.map((cl) => ({
          ...cl,
          email: cl.email || '-',
          clientType: mapClientType(cl.clientType),
          createdAt: new Date(cl.createdAt).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN'),
        }));
      } else {
        // Default to hearing history
        reportTitle = isMr ? 'सुनावणी कामकाज व आदेश इतिहास' : 'Hearing Proceedings History Report';
        columns = [
          { header: isMr ? 'प्रकरण क्रमांक' : 'Case Number', key: 'caseNumber', width: 110 },
          { header: isMr ? 'सुनावणी तारीख' : 'Hearing Date', key: 'hearingDate', width: 90 },
          { header: isMr ? 'न्यायालय' : 'Court Name', key: 'courtName', width: 130 },
          { header: isMr ? 'कामकाज / उद्देश' : 'Business / Purpose', key: 'purpose', width: 130 },
          { header: isMr ? 'कामकाज तपशील' : 'Proceedings', key: 'proceedings', width: 180 },
          { header: isMr ? 'पुढील तारीख' : 'Next Date', key: 'nextHearingDate', width: 90 },
        ];

        const hearings = await Hearing.find({ workspaceId }).sort({ hearingDate: -1 }).limit(100).lean();
        dataRows = hearings.map((h) => ({
          ...h,
          purpose: h.purpose || '-',
          proceedings: h.proceedings || '-',
          hearingDate: new Date(h.hearingDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN'),
          nextHearingDate: h.nextHearingDate ? new Date(h.nextHearingDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN') : '-',
        }));
      }

      const pdfBuffer = await PDFExportService.generateReport({
        reportTitle,
        workspace,
        dateRangeText: startDate && endDate ? `${startDate} to ${endDate}` : undefined,
        filterText: court ? `${isMr ? 'न्यायालय' : 'Court'}: ${court}` : undefined,
        columns,
        data: dataRows,
        lang: isMr ? 'mr' : 'en',
      });

      // Audit log
      ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: 'REPORT_EXPORTED',
        resourceType: 'Report',
        details: { format: 'PDF', reportType, rowCount: dataRows.length, lang: isMr ? 'mr' : 'en' },
        ipAddress: req.ip,
      }).catch((e) => console.error(e));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="advd-${reportType}-${Date.now()}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 9. Excel Export Handler
  // --------------------------------------------------------------------------
  exportExcel: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        res.status(404).json({ success: false, message: 'Workspace not found.' });
        return;
      }

      const { reportType = 'case-register', startDate, endDate, court, status, caseType, lang = 'en' } = req.query;
      const isMr = (lang as string) === 'mr';

      const mapStatus = (s: string) => {
        if (!isMr) return s;
        switch (s) {
          case 'Pending': return 'प्रलंबित';
          case 'Disposed': return 'निकाली';
          case 'Stayed': return 'स्थगिती';
          case 'Archived': return 'अभिलेखात';
          default: return s;
        }
      };

      const mapPriority = (p: string) => {
        if (!isMr) return p;
        switch (p?.toUpperCase()) {
          case 'LOW': return 'कमी';
          case 'MEDIUM': return 'मध्यम';
          case 'HIGH': return 'उच्च';
          case 'URGENT': return 'तातडीचे';
          default: return p;
        }
      };

      const mapTaskStatus = (s: string) => {
        if (!isMr) return s;
        switch (s?.toLowerCase()) {
          case 'pending': return 'प्रलंबित';
          case 'in_progress': return 'प्रगतीपथावर';
          case 'completed': return 'पूर्ण';
          case 'overdue': return 'मुदत संपलेले';
          default: return s;
        }
      };

      const mapClientType = (t: string) => {
        if (!isMr) return t;
        switch (t) {
          case 'Individual': return 'वैयक्तिक';
          case 'Corporate': return 'कंपनी / संस्था';
          case 'Government': return 'शासकीय';
          case 'Other': return 'इतर';
          default: return t;
        }
      };

      let sheetName = isMr ? 'प्रकरण नोंदवही' : 'Case Register';
      let reportTitle = isMr ? 'प्रकरण नोंदवही' : 'Chamber Case Register';
      let columns: any[] = [];
      let dataRows: any[] = [];

      const query: any = { workspaceId, isArchived: { $ne: true } };
      if (court) query.courtName = new RegExp((court as string).trim(), 'i');
      if (status && status !== 'All') query.status = status;
      if (caseType && caseType !== 'All') query.caseType = caseType;

      if (reportType === 'case-register') {
        sheetName = isMr ? 'प्रकरण नोंदवही' : 'Case Register';
        reportTitle = isMr ? 'प्रकरण नोंदवही' : 'Case Register';
        columns = [
          { header: isMr ? 'प्रकरण क्रमांक' : 'Case Number', key: 'caseNumber', width: 20 },
          { header: isMr ? 'सी.एन.आर. क्र.' : 'CNR Number', key: 'cnrNumber', width: 24 },
          { header: isMr ? 'न्यायालयाचे नाव' : 'Court Name', key: 'courtName', width: 28 },
          { header: isMr ? 'प्रकरण प्रकार' : 'Case Type', key: 'caseType', width: 18 },
          { header: isMr ? 'पक्षकाराचे नाव' : 'Client Name', key: 'clientName', width: 24 },
          { header: isMr ? 'विरोधी पक्षाचे नाव' : 'Opponent Name', key: 'opponentName', width: 24 },
          { header: isMr ? 'दाखल तारीख' : 'Filing Date', key: 'filingDate', width: 16 },
          { header: isMr ? 'पुढील तारीख' : 'Next Hearing Date', key: 'nextHearingDate', width: 18 },
          { header: isMr ? 'पुढील सुनावणीचे काम' : 'Next Hearing Purpose', key: 'nextHearingPurpose', width: 26 },
          { header: isMr ? 'स्थिती' : 'Case Status', key: 'status', width: 16 },
        ];

        const cases = await Case.find(query).sort({ caseNumber: 1 }).lean();
        dataRows = cases.map((c) => ({
          ...c,
          status: mapStatus(c.status),
          cnrNumber: c.cnrNumber || '-',
          filingDate: c.filingDate ? new Date(c.filingDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN') : '-',
          nextHearingDate: c.nextHearingDate ? new Date(c.nextHearingDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN') : '-',
          nextHearingPurpose: c.nextHearingPurpose || '-',
        }));
      } else if (reportType === 'daily-diary' || reportType === 'weekly-diary' || reportType === 'monthly-diary') {
        sheetName = isMr
          ? reportType === 'daily-diary'
            ? 'दैनंदिन डायरी'
            : reportType === 'weekly-diary'
            ? 'साप्ताहिक डायरी'
            : 'मासिक डायरी'
          : reportType === 'daily-diary'
          ? 'Daily Diary'
          : reportType === 'weekly-diary'
          ? 'Weekly Diary'
          : 'Monthly Diary';

        reportTitle = isMr
          ? reportType === 'daily-diary'
            ? 'दैनंदिन न्यायालयीन डायरी'
            : reportType === 'weekly-diary'
            ? 'साप्ताहिक न्यायालयीन डायरी'
            : 'मासिक न्यायालयीन डायरी'
          : reportType === 'daily-diary'
          ? 'Daily Court Diary'
          : reportType === 'weekly-diary'
          ? 'Weekly Court Diary'
          : 'Monthly Court Diary';

        columns = [
          { header: isMr ? 'प्रकरण क्रमांक' : 'Case Number', key: 'caseNumber', width: 20 },
          { header: isMr ? 'न्यायालयाचे नाव' : 'Court Name', key: 'courtName', width: 28 },
          { header: isMr ? 'कक्ष' : 'Court Room', key: 'courtRoomNumber', width: 14 },
          { header: isMr ? 'पक्षकाराचे नाव' : 'Client Name', key: 'clientName', width: 24 },
          { header: isMr ? 'विरोधी पक्ष' : 'Opponent Name', key: 'opponentName', width: 24 },
          { header: isMr ? 'सुनावणीचे काम' : 'Purpose of Hearing', key: 'purpose', width: 26 },
          { header: isMr ? 'सुनावणी तारीख' : 'Hearing Date', key: 'hearingDate', width: 16 },
        ];

        if (startDate || endDate) {
          query.nextHearingDate = {};
          if (startDate) query.nextHearingDate.$gte = new Date(startDate as string);
          if (endDate) {
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
            query.nextHearingDate.$lte = end;
          }
        }

        const cases = await Case.find(query).sort({ nextHearingDate: 1, courtName: 1 }).lean();
        dataRows = cases.map((c) => ({
          ...c,
          courtRoomNumber: c.courtRoomNumber || '-',
          purpose: c.nextHearingPurpose || (isMr ? 'सुनावणी' : 'Hearing'),
          hearingDate: c.nextHearingDate ? new Date(c.nextHearingDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN') : '-',
        }));
      } else if (reportType === 'hearing-history') {
        sheetName = isMr ? 'सुनावणी इतिहास' : 'Hearing History';
        reportTitle = isMr ? 'सुनावणी कामकाज व आदेश इतिहास' : 'Hearing Proceedings History';
        columns = [
          { header: isMr ? 'प्रकरण क्रमांक' : 'Case Number', key: 'caseNumber', width: 20 },
          { header: isMr ? 'न्यायालयाचे नाव' : 'Court Name', key: 'courtName', width: 28 },
          { header: isMr ? 'सुनावणी तारीख' : 'Hearing Date', key: 'hearingDate', width: 16 },
          { header: isMr ? 'सुनावणीचे काम' : 'Purpose of Hearing', key: 'purpose', width: 24 },
          { header: isMr ? 'कामकाज / न्यायालय आदेश' : 'Proceedings / Order', key: 'proceedings', width: 40 },
          { header: isMr ? 'पुढील तारीख' : 'Next Hearing Date', key: 'nextHearingDate', width: 18 },
          { header: isMr ? 'पुढील कामाचा उद्देश' : 'Next Purpose', key: 'nextPurpose', width: 24 },
        ];

        const hearings = await Hearing.find({ workspaceId }).sort({ hearingDate: -1 }).lean();
        dataRows = hearings.map((h) => ({
          ...h,
          hearingDate: new Date(h.hearingDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN'),
          nextHearingDate: h.nextHearingDate ? new Date(h.nextHearingDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN') : '-',
          nextPurpose: h.nextHearingPurpose || '-',
        }));
      } else if (reportType === 'client-list') {
        sheetName = isMr ? 'पक्षकार' : 'Clients';
        reportTitle = isMr ? 'कार्यालयीन पक्षकार नोंदवही' : 'Chamber Client Directory';
        columns = [
          { header: isMr ? 'पक्षकाराचे नाव' : 'Client Name', key: 'fullName', width: 28 },
          { header: isMr ? 'भ्रमणध्वनी' : 'Mobile Number', key: 'mobile', width: 18 },
          { header: isMr ? 'ईमेल' : 'Email Address', key: 'email', width: 26 },
          { header: isMr ? 'पक्षकार वर्गवारी' : 'Client Category', key: 'clientType', width: 16 },
          { header: isMr ? 'पत्ता' : 'Address', key: 'address', width: 36 },
          { header: isMr ? 'नोंदणी तारीख' : 'Registration Date', key: 'createdAt', width: 18 },
        ];

        const clients = await Client.find({ workspaceId, isArchived: { $ne: true } }).sort({ fullName: 1 }).lean();
        dataRows = clients.map((cl) => ({
          ...cl,
          email: cl.email || '-',
          address: cl.address || '-',
          clientType: mapClientType(cl.clientType),
          createdAt: new Date(cl.createdAt).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN'),
        }));
      } else {
        // Task list
        sheetName = isMr ? 'कामे' : 'Tasks';
        reportTitle = isMr ? 'कार्यालयीन कामे व वाटप' : 'Task Assignments';
        columns = [
          { header: isMr ? 'कामाचे नाव' : 'Task Title', key: 'title', width: 30 },
          { header: isMr ? 'प्राधान्य' : 'Priority', key: 'priority', width: 14 },
          { header: isMr ? 'स्थिती' : 'Status', key: 'status', width: 16 },
          { header: isMr ? 'नेमलेली व्यक्ती' : 'Assigned To', key: 'assignedName', width: 24 },
          { header: isMr ? 'अंतिम मुदत' : 'Due Date', key: 'dueDate', width: 16 },
          { header: isMr ? 'तयार तारीख' : 'Created Date', key: 'createdAt', width: 16 },
        ];

        const tasks = await Task.find({ workspaceId }).populate('assignedTo', 'fullName').sort({ dueDate: 1 }).lean();
        dataRows = tasks.map((t) => ({
          ...t,
          assignedName: (t.assignedTo as any)?.fullName || (isMr ? 'अनियुक्त' : 'Unassigned'),
          dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN') : '-',
          createdAt: new Date(t.createdAt).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN'),
          status: mapTaskStatus(t.status),
          priority: mapPriority(t.priority),
        }));
      }

      const excelBuffer = await ExcelExportService.generateReport({
        sheetName,
        reportTitle,
        workspace,
        columns,
        data: dataRows,
        lang: isMr ? 'mr' : 'en',
      });

      // Audit log
      ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: 'REPORT_EXPORTED',
        resourceType: 'Report',
        details: { format: 'Excel', reportType, rowCount: dataRows.length, lang: isMr ? 'mr' : 'en' },
        ipAddress: req.ip,
      }).catch((e) => console.error(e));

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="advd-${reportType}-${Date.now()}.xlsx"`
      );
      res.send(excelBuffer);
    } catch (error) {
      next(error);
    }
  },
};

