import mongoose from 'mongoose';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createApp } from '../app.js';
import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMembership } from '../models/WorkspaceMembership.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Case } from '../models/Case.js';
import { Client } from '../models/Client.js';
import { Hearing } from '../models/Hearing.js';
import { Task } from '../models/Task.js';
import { DocumentModel } from '../models/Document.js';

const runTests = async () => {
  console.log('\n======================================================');
  console.log('   AdvD PHASE 5: DOCUMENTS & REPORTS TEST SUITE');
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
    await User.deleteMany({ email: /@phase5-test\.com$/ });
    await RefreshToken.deleteMany({});
    const testWorkspaces = await Workspace.find({ name: /Phase 5 Chamber/ });
    const wsIds = testWorkspaces.map((w) => w._id);
    await Workspace.deleteMany({ _id: { $in: wsIds } });
    await WorkspaceMembership.deleteMany({ workspaceId: { $in: wsIds } });
    await ActivityLog.deleteMany({ workspaceId: { $in: wsIds } });
    await Case.deleteMany({ workspaceId: { $in: wsIds } });
    await Client.deleteMany({ workspaceId: { $in: wsIds } });
    await Hearing.deleteMany({ workspaceId: { $in: wsIds } });
    await Task.deleteMany({ workspaceId: { $in: wsIds } });
    await DocumentModel.deleteMany({ workspaceId: { $in: wsIds } });

    console.log('1. Setting up Chamber A (Advocate + Clerk) & Chamber B (Advocate)');

    // Register Advocate A
    const advARes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Advocate Sneha Roy',
        email: 'sneha.roy@phase5-test.com',
        mobile: '+919833344455',
        password: 'Password@123',
        barCouncilNumber: 'MAH/7788/2013',
        stateBarCouncil: 'Bar Council of Maharashtra & Goa',
        officeName: 'Phase 5 Chamber A - Roy Legal Associates',
      });

    assert(advARes.status === 201, 'Advocate A registered with HTTP 201');
    const tokenA = advARes.body.data.tokens.accessToken;
    const wsAId = advARes.body.data.workspace.id;

    // Register Advocate B
    const advBRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Advocate Amit Deshmukh',
        email: 'amit.deshmukh@phase5-test.com',
        mobile: '+919866677788',
        password: 'Password@123',
        barCouncilNumber: 'MAH/9900/2017',
        stateBarCouncil: 'Bar Council of Maharashtra & Goa',
        officeName: 'Phase 5 Chamber B - Deshmukh Chambers',
      });

    assert(advBRes.status === 201, 'Advocate B registered in independent workspace B');
    const tokenB = advBRes.body.data.tokens.accessToken;
    const wsBId = advBRes.body.data.workspace.id;

    // Create Clerk in Chamber A
    const bcrypt = (await import('bcryptjs')).default;
    const clerkPass = await bcrypt.hash('Password@123', 10);
    const clerkUser = await User.create({
      fullName: 'Vinod Clerk',
      email: 'vinod.clerk@phase5-test.com',
      mobile: '+919855566677',
      passwordHash: clerkPass,
      systemRole: 'user',
      status: 'active',
    });

    await WorkspaceMembership.create({
      workspaceId: wsAId,
      userId: clerkUser._id,
      role: 'clerk',
      status: 'active',
    });

    const clerkLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'vinod.clerk@phase5-test.com',
        password: 'Password@123',
        workspaceId: wsAId,
      });

    const clerkToken = clerkLoginRes.body.data.tokens.accessToken;
    assert(!!clerkToken, 'Clerk A authenticated in Chamber A');

    // Create Sample Client and Case in Chamber A
    const clientA = await Client.create({
      workspaceId: wsAId,
      fullName: 'Kaveri Infotech Solutions',
      mobile: '+919922233344',
      email: 'legal@kaveri.com',
      clientType: 'Corporate',
      address: 'Bandra Kurla Complex, Mumbai',
    });

    const caseA = await Case.create({
      workspaceId: wsAId,
      caseNumber: 'ARB/102/2026',
      cnrNumber: 'MHCB010099882026',
      courtName: 'Bombay High Court',
      courtLocation: 'Commercial Division',
      courtRoomNumber: 'Courtroom 18',
      caseType: 'Civil',
      clientId: clientA._id,
      clientName: clientA.fullName,
      opponentName: 'Apex Infrastructure Ltd',
      status: 'Pending',
      nextHearingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      nextHearingPurpose: 'Hearing on Interim Relief Application',
    });

    assert(!!caseA._id, 'Sample case created in Chamber A');

    console.log('\n2. Testing Document Uploads (PDF, Word, Images) & File Validation');

    // Prepare temporary test files
    const dummyPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n162\n%%EOF');
    const dummyPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const dummyDocxBuffer = Buffer.from('PK\x03\x04\x14\x00\x00\x00\x08\x00MockDOCXContentForAdvDTestingPurposes');

    // Upload 1: PDF Document attached to Case and Client
    const uploadPdfRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('title', 'Interim Relief Petition')
      .field('category', 'Petitions')
      .field('description', 'Commercial Arbitration Petition under Section 9')
      .field('caseId', caseA._id.toString())
      .field('clientId', clientA._id.toString())
      .attach('file', dummyPdfBuffer, { filename: 'Section9_Petition.pdf', contentType: 'application/pdf' });

    assert(uploadPdfRes.status === 201, 'PDF Document uploaded with HTTP 201');
    assert(uploadPdfRes.body.data.title === 'Interim Relief Petition', 'Document title verified');
    assert(uploadPdfRes.body.data.caseId.caseNumber === 'ARB/102/2026', 'Populated case number verified');
    assert(uploadPdfRes.body.data.clientId.fullName === 'Kaveri Infotech Solutions', 'Populated client name verified');
    const pdfDocId = uploadPdfRes.body.data._id;

    // Upload 2: Case Document upload via case-specific endpoint
    const uploadCaseDocRes = await request(app)
      .post(`/api/cases/${caseA._id}/documents`)
      .set('Authorization', `Bearer ${tokenA}`)
      .field('title', 'Notice of Motion Order')
      .field('category', 'Court Orders')
      .attach('file', dummyPdfBuffer, { filename: 'Order_NoticeOfMotion.pdf', contentType: 'application/pdf' });

    assert(uploadCaseDocRes.status === 201, 'Case document uploaded via POST /api/cases/:id/documents (HTTP 201)');
    assert(uploadCaseDocRes.body.data.category === 'Court Orders', 'Category is Court Orders');
    const caseDocId = uploadCaseDocRes.body.data._id;

    // Upload 3: Image (Evidence Exhibit)
    const uploadImgRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('title', 'Site Inspection Photograph')
      .field('category', 'Evidence')
      .field('caseId', caseA._id.toString())
      .attach('file', dummyPngBuffer, { filename: 'SitePhoto.png', contentType: 'image/png' });

    assert(uploadImgRes.status === 201, 'PNG Image uploaded with HTTP 201');
    const imgDocId = uploadImgRes.body.data._id;

    // Upload 4: Clerk uploads document (Permitted)
    const clerkUploadRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${clerkToken}`)
      .field('title', 'Affidavit of Service')
      .field('category', 'Affidavits')
      .field('caseId', caseA._id.toString())
      .attach('file', dummyPdfBuffer, { filename: 'AffidavitService.pdf', contentType: 'application/pdf' });

    assert(clerkUploadRes.status === 201, 'Clerk successfully uploaded authorized document (HTTP 201)');

    // Upload 5: Unsupported file rejection (e.g., .exe)
    const rejectExeRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('title', 'Malicious Script')
      .attach('file', Buffer.from('MZFakeBinary'), { filename: 'trojan.exe', contentType: 'application/octet-stream' });

    assert(rejectExeRes.status >= 400, 'Unsupported executable file (.exe) rejected');

    console.log('\n3. Testing Document Listing, Search & Category Filters');
    const listRes = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(listRes.status === 200, 'GET /api/documents returned HTTP 200');
    assert(listRes.body.data.documents.length >= 4, 'Lists all Chamber A documents');

    // Search by title
    const searchRes = await request(app)
      .get('/api/documents?search=Interim')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(searchRes.status === 200, 'Search by title returned HTTP 200');
    assert(searchRes.body.data.documents.length >= 1, 'Search found matching title');
    assert(searchRes.body.data.documents[0].title.includes('Interim'), 'Matched document title');

    // Filter by Category
    const categoryFilterRes = await request(app)
      .get('/api/documents?category=Court%20Orders')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(categoryFilterRes.status === 200, 'Filter by category returned HTTP 200');
    assert(
      categoryFilterRes.body.data.documents.every((d: any) => d.category === 'Court Orders'),
      'All returned documents match Court Orders category'
    );

    // Filter by Case
    const caseDocsRes = await request(app)
      .get(`/api/cases/${caseA._id}/documents`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(caseDocsRes.status === 200, 'GET /api/cases/:id/documents returned HTTP 200');
    assert(caseDocsRes.body.data.length >= 4, 'Returns documents attached to caseA');

    console.log('\n4. Testing Document Preview & Download Streams');
    // Preview PDF
    const previewRes = await request(app)
      .get(`/api/documents/${pdfDocId}/preview`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(previewRes.status === 200, 'Preview endpoint returned HTTP 200');
    assert(previewRes.headers['content-type'] === 'application/pdf', 'Content-Type is application/pdf');
    assert(previewRes.headers['content-disposition'].includes('inline'), 'Content-Disposition is inline');

    // Download PDF
    const downloadRes = await request(app)
      .get(`/api/documents/${pdfDocId}/download`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(downloadRes.status === 200, 'Download endpoint returned HTTP 200');
    assert(downloadRes.headers['content-disposition'].includes('attachment'), 'Content-Disposition is attachment');
    assert(downloadRes.headers['content-disposition'].includes('Section9_Petition.pdf'), 'Original filename in header');

    console.log('\n5. Testing Document Metadata Update & Clerk Delete Restrictions');
    // Update metadata
    const updateRes = await request(app)
      .patch(`/api/documents/${pdfDocId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Commercial Arbitration Petition (Amended)',
        category: 'Petitions',
        description: 'Updated with schedule of damaged equipment',
      });

    assert(updateRes.status === 200, 'PATCH /api/documents/:id updated metadata successfully');
    assert(
      updateRes.body.data.title === 'Commercial Arbitration Petition (Amended)',
      'Updated title verified'
    );

    // Permission enforcement: Clerk attempts to delete document -> MUST FAIL with 403 Forbidden!
    const clerkDeleteRes = await request(app)
      .delete(`/api/documents/${caseDocId}`)
      .set('Authorization', `Bearer ${clerkToken}`);

    assert(
      clerkDeleteRes.status === 403,
      'Clerk restricted from deleting case document (HTTP 403 Forbidden)'
    );

    // Advocate deletes document -> SUCCESS
    const advocateDeleteRes = await request(app)
      .delete(`/api/documents/${caseDocId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(advocateDeleteRes.status === 200, 'Advocate deleted document successfully (HTTP 200)');

    console.log('\n6. Testing Reports Analytics (Overview, Cases, Hearings, Tasks, Clients, Staff)');
    // Overview report
    const overviewRes = await request(app)
      .get('/api/reports/overview')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(overviewRes.status === 200, 'GET /api/reports/overview returned HTTP 200');
    assert(overviewRes.body.data.cases.total >= 1, 'Overview reports case counts');
    assert(overviewRes.body.data.hearings.upcomingNext30Days >= 1, 'Overview reports upcoming hearings');

    // Cases report
    const casesReportRes = await request(app)
      .get('/api/reports/cases')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(casesReportRes.status === 200, 'GET /api/reports/cases returned HTTP 200');
    assert(casesReportRes.body.data.casesByCourt.length >= 1, 'Reports court venue distribution');
    assert(casesReportRes.body.data.casesByCaseType.length >= 1, 'Reports case type distribution');

    // Hearings report
    const hearingsReportRes = await request(app)
      .get('/api/reports/hearings')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(hearingsReportRes.status === 200, 'GET /api/reports/hearings returned HTTP 200');
    assert(hearingsReportRes.body.data.summary.upcomingHearings >= 1, 'Reports scheduled upcoming hearings');

    // Staff report
    const staffReportRes = await request(app)
      .get('/api/reports/staff')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(staffReportRes.status === 200, 'GET /api/reports/staff returned HTTP 200');
    assert(staffReportRes.body.data.members.length >= 2, 'Reports chamber team members (Advocate + Clerk)');

    console.log('\n7. Testing PDF & Excel Export Generation');
    // PDF Export: Case Register
    const pdfExportRes = await request(app)
      .get('/api/reports/export/pdf?reportType=case-register')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(pdfExportRes.status === 200, 'GET /api/reports/export/pdf returned HTTP 200');
    assert(pdfExportRes.headers['content-type'] === 'application/pdf', 'Export Content-Type is application/pdf');
    assert(
      pdfExportRes.headers['content-disposition'].includes('advd-case-register'),
      'Export filename matches case-register'
    );
    assert(pdfExportRes.body.length > 500, 'Generated valid non-empty PDF binary');

    // Excel Export: Case Register
    const excelExportRes = await request(app)
      .get('/api/reports/export/excel?reportType=case-register')
      .set('Authorization', `Bearer ${tokenA}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    assert(excelExportRes.status === 200, 'GET /api/reports/export/excel returned HTTP 200');
    assert(
      excelExportRes.headers['content-type'].includes('spreadsheetml.sheet'),
      'Export Content-Type is XLSX spreadsheet'
    );
    assert(
      (excelExportRes.body?.length || parseInt(excelExportRes.headers['content-length'] || '0')) > 1000,
      'Generated valid non-empty Excel workbook'
    );

    console.log('\n8. Testing STRICT MULTI-TENANT ISOLATION for Documents & Reports');
    // Advocate B attempts to download Chamber A's document -> MUST FAIL with 404 Not Found!
    const crossDownloadRes = await request(app)
      .get(`/api/documents/${pdfDocId}/download`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert(
      crossDownloadRes.status === 404,
      'Cross-workspace document download REJECTED with HTTP 404 Not Found'
    );

    // Advocate B attempts to preview Chamber A's document -> MUST FAIL with 404 Not Found!
    const crossPreviewRes = await request(app)
      .get(`/api/documents/${pdfDocId}/preview`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert(
      crossPreviewRes.status === 404,
      'Cross-workspace document preview REJECTED with HTTP 404 Not Found'
    );

    // Advocate B attempts to delete Chamber A's document -> MUST FAIL with 404 Not Found!
    const crossDeleteRes = await request(app)
      .delete(`/api/documents/${pdfDocId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert(
      crossDeleteRes.status === 404,
      'Cross-workspace document deletion REJECTED with HTTP 404 Not Found'
    );

    // Chamber B reports isolation: Chamber B has 0 cases in report
    const bReportRes = await request(app)
      .get('/api/reports/cases')
      .set('Authorization', `Bearer ${tokenB}`);

    assert(
      bReportRes.body.data.summary.totalCases === 0,
      'Chamber B report reflects 0 cases from Chamber A (Strict multi-tenant isolation)'
    );

    console.log('\n9. Testing Activity Audit Logging for Phase 5');
    const logs = await ActivityLog.find({
      workspaceId: wsAId,
      action: {
        $in: [
          'DOCUMENT_UPLOADED',
          'DOCUMENT_METADATA_UPDATED',
          'DOCUMENT_DOWNLOADED',
          'DOCUMENT_DELETED',
          'REPORT_EXPORTED',
        ],
      },
    });

    assert(logs.length >= 3, 'Activity logs recorded for document and report actions');

    console.log('\n======================================================');
    console.log(`   PHASE 5 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('======================================================\n');

    await closeDB();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Phase 5 test execution error:', err);
    await closeDB();
    process.exit(1);
  }
};

runTests();
