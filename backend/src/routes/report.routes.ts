import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/tenant.middleware.js';

const router = Router();

// All report routes require authentication and workspace context
router.use(requireAuth, requireWorkspace);

// 1. Dashboard Overview
router.get('/overview', reportController.getOverview);

// 2. Case Reports & Analytics
router.get('/cases', reportController.getCasesReport);

// 3. Hearing Reports & Roster Analytics
router.get('/hearings', reportController.getHearingsReport);

// 4. Daily Court Diary Report
router.get('/diary', reportController.getDiaryReport);

// 5. Task Reports & Productivity Analytics
router.get('/tasks', reportController.getTasksReport);

// 6. Client Analytics Report
router.get('/clients', reportController.getClientsReport);

// 7. Staff & Workspace Workload Report
router.get('/staff', reportController.getStaffReport);

// 8. PDF Export (Printable Chamber Reports)
router.get('/export/pdf', reportController.exportPdf);

// 9. Excel Export (Structured XLSX Workbooks)
router.get('/export/excel', reportController.exportExcel);

export default router;

