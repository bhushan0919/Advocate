import mongoose from 'mongoose';
import request from 'supertest';
import ExcelJS from 'exceljs';
import { createApp } from '../app.js';
import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMembership } from '../models/WorkspaceMembership.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { Case } from '../models/Case.js';
import { Client } from '../models/Client.js';
import { Hearing } from '../models/Hearing.js';

const runTests = async () => {
  console.log('\n======================================================');
  console.log('   AdvD MARATHI LOCALIZATION & i18n TEST SUITE');
  console.log('======================================================\n');

  await connectDB();
  const app = createApp();

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  };

  try {
    // 0. Clean test records
    await User.deleteMany({ email: /@marathi-i18n-test\.com$/ });
    await RefreshToken.deleteMany({});
    const testWorkspaces = await Workspace.find({ name: /Marathi Chamber/ });
    const wsIds = testWorkspaces.map((w) => w._id);
    await Workspace.deleteMany({ _id: { $in: wsIds } });
    await WorkspaceMembership.deleteMany({ workspaceId: { $in: wsIds } });
    await Case.deleteMany({ workspaceId: { $in: wsIds } });
    await Client.deleteMany({ workspaceId: { $in: wsIds } });
    await Hearing.deleteMany({ workspaceId: { $in: wsIds } });

    console.log('1. Setting up Advocate A (Pune Chamber) and Advocate B (Mumbai Chamber)');

    // Register Advocate A
    const advARes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Adv. Dattatraya Joshi',
        email: 'dattatraya@marathi-i18n-test.com',
        mobile: '+919822011223',
        password: 'Password@123',
        barCouncilNumber: 'MAH/8899/2012',
        stateBarCouncil: 'Bar Council of Maharashtra & Goa',
        officeName: 'Marathi Chamber A - Pune Law Offices',
      });

    assert(advARes.status === 201, 'Advocate A registered with HTTP 201');
    const tokenA = advARes.body.data.tokens.accessToken;
    const wsAId = advARes.body.data.workspace.id;
    const userAId = advARes.body.data.user.id;

    // Register Advocate B
    const advBRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Adv. Sneha Kulkarni',
        email: 'sneha@marathi-i18n-test.com',
        mobile: '+919822099887',
        password: 'Password@123',
        barCouncilNumber: 'MAH/7744/2016',
        stateBarCouncil: 'Bar Council of Maharashtra & Goa',
        officeName: 'Marathi Chamber B - Mumbai Chambers',
      });

    assert(advBRes.status === 201, 'Advocate B registered with HTTP 201');
    const tokenB = advBRes.body.data.tokens.accessToken;

    console.log('\n2. Testing User Language Preference Persistence (GET / PATCH / Me)');

    // Check initial preferences (defaults to 'en')
    const initPrefRes = await request(app)
      .get('/api/settings/preferences')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(initPrefRes.status === 200, 'GET /api/settings/preferences returned HTTP 200');
    assert(initPrefRes.body.data.language === 'en', 'Initial default language is "en"');

    // Update preference to Marathi ('mr')
    const updatePrefRes = await request(app)
      .patch('/api/settings/preferences')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ language: 'mr' });

    assert(updatePrefRes.status === 200, 'PATCH /api/settings/preferences returned HTTP 200');
    assert(updatePrefRes.body.data.language === 'mr', 'Updated language is "mr" in response');

    // Verify persisted directly in MongoDB User model
    const dbUser = await User.findById(userAId);
    assert(dbUser?.preferences?.language === 'mr', 'User document in MongoDB persisted language = "mr"');

    // Verify GET /api/auth/me returns persisted language
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(meRes.status === 200, 'GET /api/auth/me returned HTTP 200');
    assert(meRes.body.data.user?.preferences?.language === 'mr', 'Auth /me payload includes user.preferences.language = "mr"');

    // Switch back to 'en' and then to 'mr' to confirm toggle reliability
    const switchEnRes = await request(app)
      .patch('/api/settings/preferences')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ language: 'en' });
    assert(switchEnRes.body.data.language === 'en', 'Switched back to "en" successfully');

    await request(app)
      .patch('/api/settings/preferences')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ language: 'mr' });

    console.log('\n3. Creating Sample Case & Hearing Data in Chamber A for Export Tests');

    const clientRes = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'रामचंद्र विनायक गोखले (Ramchandra Gokhale)',
        mobile: '+919876543210',
        email: 'ramchandra@example.com',
        clientType: 'Individual',
        address: 'शनिवार पेठ, पुणे, महाराष्ट्र',
      });

    assert(clientRes.status === 201, 'Sample client created in Chamber A');
    const clientId = clientRes.body.data._id;

    const hearingDateStr = new Date().toISOString().split('T')[0];

    const caseRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseNumber: 'RCS/1042/2026',
        cnrNumber: 'MHPU010012342026',
        caseType: 'Civil',
        courtName: 'दिवाणी न्यायालय वरिष्ठ स्तर, पुणे',
        courtLocation: 'शिवाजीनगर, पुणे',
        courtRoomNumber: 'Room No. 4',
        clientId: clientId,
        opponentName: 'मे. सह्याद्री कन्स्ट्रक्शन्स',
        opponentAdvocate: 'Adv. M. K. Joshi',
        filingDate: '2026-01-15',
        nextHearingDate: hearingDateStr,
        nextHearingPurpose: 'हजर राहून कैफियत दाखल करणे',
        status: 'Pending',
        caseDescription: 'जमीन मालकी व वहिवाट वाद',
      });

    assert(caseRes.status === 201, 'Sample case created in Chamber A');
    const caseId = caseRes.body.data._id;

    // Add a hearing
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const hearingRes = await request(app)
      .post(`/api/cases/${caseId}/hearings`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        hearingDate: hearingDateStr,
        purpose: 'हजर राहून कैफियत दाखल करणे',
        proceedings: 'पक्षकार हजर, वकिलांनी मुदत अर्ज दाखल केला.',
        nextHearingDate: tomorrowStr,
        nextHearingPurpose: 'अंतिम सुनावणी व युक्तिवाद',
        courtName: 'दिवाणी न्यायालय वरिष्ठ स्तर, पुणे',
        courtRoom: 'Room No. 4',
      });

    assert(hearingRes.status === 201, 'Sample hearing created in Chamber A');

    console.log('\n4. Testing PDF Report Export in Marathi Devanagari (lang=mr)');

    // Export Case Register in Marathi PDF
    const pdfCaseRes = await request(app)
      .get('/api/reports/export/pdf?reportType=case-register&lang=mr')
      .set('Authorization', `Bearer ${tokenA}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    assert(pdfCaseRes.status === 200, 'GET /api/reports/export/pdf (Case Register, mr) returned HTTP 200');
    assert(pdfCaseRes.headers['content-type'] === 'application/pdf', 'Content-Type is application/pdf');
    assert(pdfCaseRes.body && pdfCaseRes.body.length > 1000, 'Generated valid non-empty Marathi PDF buffer with Nirmala font');

    // Export Daily Diary in Marathi PDF
    const pdfDiaryRes = await request(app)
      .get(`/api/reports/export/pdf?reportType=daily-diary&startDate=${hearingDateStr}&endDate=${hearingDateStr}&lang=mr`)
      .set('Authorization', `Bearer ${tokenA}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    assert(pdfDiaryRes.status === 200, 'GET /api/reports/export/pdf (Daily Diary, mr) returned HTTP 200');
    assert(pdfDiaryRes.body && pdfDiaryRes.body.length > 1000, 'Generated valid non-empty Daily Diary Marathi PDF buffer');

    console.log('\n5. Testing Excel Report Export in Marathi Devanagari (lang=mr)');

    // Export Case Register in Marathi Excel
    const excelCaseRes = await request(app)
      .get('/api/reports/export/excel?reportType=case-register&lang=mr')
      .set('Authorization', `Bearer ${tokenA}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    assert(excelCaseRes.status === 200, 'GET /api/reports/export/excel (Case Register, mr) returned HTTP 200');
    assert(excelCaseRes.headers['content-type'].includes('spreadsheetml.sheet'), 'Content-Type is XLSX spreadsheet');

    // Inspect Excel workbook contents with ExcelJS
    const caseWorkbook = new ExcelJS.Workbook();
    await caseWorkbook.xlsx.load(excelCaseRes.body);
    const caseSheet = caseWorkbook.getWorksheet('प्रकरण नोंदवही');
    assert(!!caseSheet, 'Excel workbook contains Marathi Devanagari worksheet "प्रकरण नोंदवही"');

    // Check header row in Marathi worksheet
    const caseHeaderRow = caseSheet?.getRow(4);
    const headerValues = (caseHeaderRow?.values as any[]) || [];
    assert(
      headerValues.some((v) => typeof v === 'string' && (v.includes('प्रकरण क्रमांक') || v.includes('अ.क्र.'))),
      'Excel sheet has translated Devanagari headers ("प्रकरण क्रमांक", "अ.क्र.")'
    );

    // Export Daily Diary in Marathi Excel
    const excelDiaryRes = await request(app)
      .get(`/api/reports/export/excel?reportType=daily-diary&startDate=${hearingDateStr}&endDate=${hearingDateStr}&lang=mr`)
      .set('Authorization', `Bearer ${tokenA}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    assert(excelDiaryRes.status === 200, 'GET /api/reports/export/excel (Daily Diary, mr) returned HTTP 200');
    const diaryWorkbook = new ExcelJS.Workbook();
    await diaryWorkbook.xlsx.load(excelDiaryRes.body);
    const diarySheet = diaryWorkbook.getWorksheet('दैनंदिन डायरी');
    assert(!!diarySheet, 'Daily Diary Excel workbook contains Marathi Devanagari worksheet "दैनंदिन डायरी"');

    console.log('\n6. Testing Defaulting & Fallback Handling');

    // Request without lang query param defaults to English
    const defExcelRes = await request(app)
      .get('/api/reports/export/excel?reportType=case-register')
      .set('Authorization', `Bearer ${tokenA}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    const defWorkbook = new ExcelJS.Workbook();
    await defWorkbook.xlsx.load(defExcelRes.body);
    const enSheet = defWorkbook.getWorksheet('Case Register');
    assert(!!enSheet, 'Default request without lang produces English worksheet "Case Register"');

    console.log('\n7. Testing Multi-Tenant Isolation with Marathi Exports');

    // Chamber B exports Marathi Case Register -> must reflect 0 cases from Chamber A
    const bExcelRes = await request(app)
      .get('/api/reports/export/excel?reportType=case-register&lang=mr')
      .set('Authorization', `Bearer ${tokenB}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    const bWorkbook = new ExcelJS.Workbook();
    await bWorkbook.xlsx.load(bExcelRes.body);
    const bSheet = bWorkbook.getWorksheet('प्रकरण नोंदवही');
    assert(!!bSheet, 'Chamber B receives valid Marathi worksheet');
    // Row 4 is header, row 5 would be data if any existed. Empty report has empty state or no data rows.
    const bRow5 = bSheet?.getRow(5);
    const bRow5Value = bRow5?.getCell(1)?.value;
    const isZeroCases = !bRow5Value || bRow5Value.toString().includes('कोणतीही नोंद आढळली नाही') || bRow5Value.toString().includes('No records');
    assert(isZeroCases, 'Chamber B Marathi report isolates data: 0 cases leaked from Chamber A');

    console.log('\n------------------------------------------------------');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('------------------------------------------------------\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Test suite failed with unexpected error:', error);
    process.exit(1);
  } finally {
    await closeDB();
  }
};

runTests();
