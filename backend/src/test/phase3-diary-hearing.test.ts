import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMembership } from '../models/WorkspaceMembership.js';
import { Client } from '../models/Client.js';
import { Case } from '../models/Case.js';
import { Hearing } from '../models/Hearing.js';
import { ActivityLog } from '../models/ActivityLog.js';

export const runPhase3Tests = async () => {
  console.log('\n======================================================');
  console.log('   AdvD PHASE 3: DIGITAL COURT DIARY & HEARINGS TEST');
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
    // Clean test data
    await User.deleteMany({ email: /@phase3-test\.com$/ });
    const oldWorkspaces = await Workspace.find({ name: /Phase 3 Test/ });
    const wsIds = oldWorkspaces.map((w) => w._id);
    await Workspace.deleteMany({ _id: { $in: wsIds } });
    await WorkspaceMembership.deleteMany({ workspaceId: { $in: wsIds } });
    await Client.deleteMany({ workspaceId: { $in: wsIds } });
    await Case.deleteMany({ workspaceId: { $in: wsIds } });
    await Hearing.deleteMany({ workspaceId: { $in: wsIds } });
    await ActivityLog.deleteMany({ workspaceId: { $in: wsIds } });

    console.log('1. Setting up Chamber A (Advocate + Clerk) & Chamber B');

    // Advocate A
    const advARes = await request(app).post('/api/auth/register').send({
      fullName: 'Adv. Sameer Joshi',
      email: 'sameer.joshi@phase3-test.com',
      mobile: '+919833311122',
      password: 'Password@123',
      barCouncilNumber: 'MAH/2020/99',
      stateBarCouncil: 'Bar Council of Maharashtra & Goa',
      officeName: 'Phase 3 Test - Joshi Chambers',
    });
    assert(advARes.status === 201, 'Advocate A registered successfully');
    const tokenA = advARes.body.data.tokens.accessToken;
    const workspaceAId = advARes.body.data.workspace.id;

    // Advocate B
    const advBRes = await request(app).post('/api/auth/register').send({
      fullName: 'Adv. Nina Sen',
      email: 'nina.sen@phase3-test.com',
      mobile: '+919833311133',
      password: 'Password@123',
      barCouncilNumber: 'WB/1998/12',
      stateBarCouncil: 'Bar Council of West Bengal',
      officeName: 'Phase 3 Test - Sen Law Offices',
    });
    assert(advBRes.status === 201, 'Advocate B registered successfully');
    const tokenB = advBRes.body.data.tokens.accessToken;
    const workspaceBId = advBRes.body.data.workspace.id;

    // Clerk in Chamber A
    const inviteRes = await request(app)
      .post('/api/workspaces/invitations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        email: 'clerk.arun@phase3-test.com',
        role: 'clerk',
      });
    const inviteToken = inviteRes.body.data.token;

    const acceptRes = await request(app).post('/api/auth/accept-invitation').send({
      token: inviteToken,
      fullName: 'Arun Gawde (Clerk)',
      mobile: '+919833311144',
      password: 'Password@123',
    });
    assert(acceptRes.status === 200, 'Clerk joined Chamber A');
    const clerkTokenA = acceptRes.body.data.tokens.accessToken;

    console.log('\n2. Creating Test Clients & Court Cases with Scheduled Dates');

    const clientRes = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Rahul Patil',
        mobile: '+919822233344',
        email: 'rahul.patil@example.com',
        clientType: 'Individual',
      });
    assert(clientRes.status === 201, 'Client created in Chamber A');
    const clientId = clientRes.body.data._id;

    // Target diary test date: 2026-10-30
    const targetDate = '2026-10-30';

    // Case 1: Scheduled for 2026-10-30 in Bombay High Court
    const case1Res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseNumber: 'RCS/123/2025',
        cnrNumber: 'MHCB010012342025',
        caseType: 'Civil',
        courtName: 'Bombay High Court',
        courtLocation: 'Fort, Mumbai',
        courtRoomNumber: 'Room 14',
        clientId: clientId,
        opponentName: 'Amit Sharma',
        opponentAdvocate: 'Adv. V. K. Grover',
        nextHearingDate: targetDate,
        nextHearingPurpose: 'Evidence of Plaintiff',
        status: 'Pending',
      });
    assert(case1Res.status === 201, 'Case 1 created with nextHearingDate = 2026-10-30');
    const case1Id = case1Res.body.data._id;

    // Case 2: Scheduled for 2026-10-30 in City Civil Court
    const case2Res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseNumber: 'SCS/456/2024',
        cnrNumber: 'MHCC020056782024',
        caseType: 'Property',
        courtName: 'City Civil Court, Mumbai',
        courtLocation: 'Fort',
        courtRoomNumber: 'Court 05',
        clientId: clientId,
        opponentName: 'Apex Builders',
        nextHearingDate: targetDate,
        nextHearingPurpose: 'Framing of Issues',
        status: 'Pending',
      });
    assert(case2Res.status === 201, 'Case 2 created with nextHearingDate = 2026-10-30');
    const case2Id = case2Res.body.data._id;

    // Case 3: Scheduled for a DIFFERENT date: 2026-11-15
    const case3Res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseNumber: 'CC/789/2026',
        caseType: 'Criminal',
        courtName: 'Metropolitan Magistrate Court',
        clientId: clientId,
        opponentName: 'State of Maharashtra',
        nextHearingDate: '2026-11-15',
        nextHearingPurpose: 'Bail Arguments',
        status: 'Pending',
      });
    assert(case3Res.status === 201, 'Case 3 created for a different date (2026-11-15)');

    console.log('\n3. Testing Daily Court Diary & Summary Retrieval');

    const diaryRes = await request(app)
      .get(`/api/diary?date=${targetDate}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(diaryRes.status === 200, 'GET /api/diary returned HTTP 200');
    assert(diaryRes.body.data.cases.length === 2, 'Daily diary returned exactly 2 scheduled cases for 2026-10-30');
    assert(diaryRes.body.data.cases[0].isCompleted === false, 'Cases initially marked as pending update');
    assert(
      diaryRes.body.data.cases[0].case.caseNumber === 'RCS/123/2025' ||
        diaryRes.body.data.cases[1].case.caseNumber === 'RCS/123/2025',
      'Case RCS/123/2025 present in diary'
    );

    // Test Summary
    const summaryRes = await request(app)
      .get(`/api/diary/summary?date=${targetDate}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(summaryRes.status === 200, 'GET /api/diary/summary returned HTTP 200');
    assert(summaryRes.body.data.totalHearings === 2, 'Total hearings for day is 2');
    assert(summaryRes.body.data.pendingUpdates === 2, 'Pending updates is 2');
    assert(summaryRes.body.data.completedUpdates === 0, 'Completed updates is 0');
    assert(summaryRes.body.data.uniqueCourts === 2, '2 distinct courts scheduled (High Court & City Civil)');

    console.log('\n4. Testing Update Hearing Functionality (Atomic Recording)');

    // Update hearing for Case 1
    const updateHearingRes = await request(app)
      .post(`/api/cases/${case1Id}/hearings`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        hearingDate: targetDate,
        purpose: 'Evidence',
        proceedings: 'Plaintiff evidence was recorded. Defendant requested additional time for cross examination.',
        nextHearingDate: '2026-11-15',
        nextHearingPurpose: 'Cross Examination',
        courtName: 'Bombay High Court',
        courtRoom: 'Room 14',
        additionalRemarks: 'Defendant costs of Rs 500 imposed by Judge',
      });

    assert(updateHearingRes.status === 201, 'Hearing recorded with HTTP 201');
    assert(!!updateHearingRes.body.data.hearing._id, 'Hearing record created with ID');
    const hearing1Id = updateHearingRes.body.data.hearing._id;

    // Verify Case nextHearingDate and previousHearingDate updated
    const updatedCaseRes = await request(app)
      .get(`/api/cases/${case1Id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    const caseDoc = updatedCaseRes.body.data;
    assert(
      new Date(caseDoc.nextHearingDate).toISOString().startsWith('2026-11-15'),
      'Case nextHearingDate updated to 2026-11-15'
    );
    assert(
      new Date(caseDoc.previousHearingDate).toISOString().startsWith('2026-10-30'),
      'Case previousHearingDate updated to 2026-10-30'
    );
    assert(caseDoc.nextHearingPurpose === 'Cross Examination', 'Case nextHearingPurpose updated');

    // Verify diary still shows Case 1 on 2026-10-30 but now marked completed!
    const diaryAfterRes = await request(app)
      .get(`/api/diary?date=${targetDate}`)
      .set('Authorization', `Bearer ${tokenA}`);

    const case1Entry = diaryAfterRes.body.data.cases.find(
      (entry: any) => entry.case.caseNumber === 'RCS/123/2025'
    );
    assert(!!case1Entry, 'Case 1 remains in 2026-10-30 diary as a completed proceeding');
    assert(case1Entry.isCompleted === true, 'Case 1 marked isCompleted = true');
    assert(
      case1Entry.proceedings.includes('Plaintiff evidence was recorded'),
      'Diary displays recorded proceedings text'
    );

    // Verify Summary updated: 1 completed, 1 pending
    const summaryAfterRes = await request(app)
      .get(`/api/diary/summary?date=${targetDate}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(summaryAfterRes.body.data.completedUpdates === 1, 'Completed updates now 1');
    assert(summaryAfterRes.body.data.pendingUpdates === 1, 'Pending updates now 1');

    console.log('\n5. Testing Immutability & Chronological Case Hearing History');

    // Add second hearing for Case 1 on next date (2026-11-15)
    const secondHearingRes = await request(app)
      .post(`/api/cases/${case1Id}/hearings`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        hearingDate: '2026-11-15',
        purpose: 'Cross Examination',
        proceedings: 'Cross examination of PW-1 completed. Matter adjourned for defense evidence.',
        nextHearingDate: '2026-12-10',
        nextHearingPurpose: 'Defense Witness DW-1 Evidence',
      });
    assert(secondHearingRes.status === 201, 'Second hearing recorded');

    // Fetch case hearing history
    const caseHearingsRes = await request(app)
      .get(`/api/cases/${case1Id}/hearings`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(caseHearingsRes.status === 200, 'GET /api/cases/:id/hearings returned HTTP 200');
    assert(caseHearingsRes.body.data.length === 2, 'Both historical hearings preserved (immutability verified)');
    assert(
      new Date(caseHearingsRes.body.data[0].hearingDate).getTime() >=
        new Date(caseHearingsRes.body.data[1].hearingDate).getTime(),
      'Hearings sorted chronologically (newest first)'
    );

    // Verify first hearing record was NEVER overwritten
    const originalHearingCheck = await Hearing.findById(hearing1Id);
    assert(
      originalHearingCheck?.purpose === 'Evidence' &&
        originalHearingCheck?.proceedings.includes('Plaintiff evidence was recorded'),
      'Original hearing record completely intact in database'
    );

    console.log('\n6. Testing Duplicate Hearing Protection');

    // Try posting identical hearing immediately
    const duplicateRes = await request(app)
      .post(`/api/cases/${case1Id}/hearings`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        hearingDate: '2026-11-15',
        purpose: 'Cross Examination',
        proceedings: 'Cross examination of PW-1 completed. Matter adjourned for defense evidence.',
        nextHearingDate: '2026-12-10',
        nextHearingPurpose: 'Defense Witness DW-1 Evidence',
      });

    assert(duplicateRes.status === 409, 'Duplicate hearing submission rejected with HTTP 409 Conflict');

    console.log('\n7. Testing Clerk Hearing Operations & Permissions');

    // Clerk in Chamber A records hearing for Case 2
    const clerkHearingRes = await request(app)
      .post(`/api/cases/${case2Id}/hearings`)
      .set('Authorization', `Bearer ${clerkTokenA}`)
      .send({
        hearingDate: targetDate,
        purpose: 'Framing of Issues',
        proceedings: 'Issues framed by Judge. Next date for filing list of documents and witnesses.',
        nextHearingDate: '2026-11-28',
        nextHearingPurpose: 'Filing List of Witnesses',
      });

    assert(clerkHearingRes.status === 201, 'Clerk successfully recorded hearing proceedings');
    const clerkHearingId = clerkHearingRes.body.data.hearing._id;

    // Clerk CANNOT execute audited correction (correction restricted to advocate/owner)
    const clerkCorrectRes = await request(app)
      .patch(`/api/hearings/${clerkHearingId}/correct`)
      .set('Authorization', `Bearer ${clerkTokenA}`)
      .send({
        reason: 'Clerk trying to alter record',
        proceedings: 'Hacked proceedings',
      });

    assert(
      clerkCorrectRes.status === 403,
      'Clerk restricted from correcting historical records (HTTP 403 Forbidden)'
    );

    console.log('\n8. Testing Controlled Audited Correction by Advocate');

    const correctRes = await request(app)
      .patch(`/api/hearings/${hearing1Id}/correct`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        reason: 'Typo in judge order details - costs were Rs 1000, not Rs 500',
        additionalRemarks: 'Corrected: Defendant costs of Rs 1000 imposed by Judge',
      });

    assert(correctRes.status === 200, 'Advocate successfully executed audited correction');
    assert(correctRes.body.data.corrections.length === 1, 'Audit corrections trail recorded');
    assert(
      correctRes.body.data.corrections[0].reason ===
        'Typo in judge order details - costs were Rs 1000, not Rs 500',
      'Audit reason preserved in history'
    );
    assert(
      correctRes.body.data.corrections[0].previousValues.additionalRemarks ===
        'Defendant costs of Rs 500 imposed by Judge',
      'Previous uncorrected value preserved in audit trail'
    );

    console.log('\n9. Testing Multi-Tenant Isolation for Diary & Hearings');

    // Advocate B tries to access Chamber A's diary
    const crossDiaryRes = await request(app)
      .get(`/api/diary?date=${targetDate}`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert(crossDiaryRes.status === 200, 'Advocate B queries their own diary');
    assert(
      crossDiaryRes.body.data.cases.length === 0,
      'Advocate B sees 0 cases in their diary (Chamber A cases completely hidden)'
    );

    // Advocate B tries to record hearing for Chamber A's Case 1
    const crossHearingPostRes = await request(app)
      .post(`/api/cases/${case1Id}/hearings`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        hearingDate: '2026-11-20',
        purpose: 'Unauthorized Hearing',
        proceedings: 'Infiltrating chamber A',
        nextHearingDate: '2026-12-20',
        nextHearingPurpose: 'Adjourned',
      });

    assert(
      crossHearingPostRes.status === 404,
      'Cross-workspace hearing creation REJECTED with HTTP 404 Not Found'
    );

    // Advocate B tries to fetch Chamber A's hearing by ID
    const crossHearingGetRes = await request(app)
      .get(`/api/hearings/${hearing1Id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert(
      crossHearingGetRes.status === 404,
      'Cross-workspace hearing view REJECTED with HTTP 404 Not Found'
    );

    console.log('\n10. Testing Workspace Hearings Register, Search & Filters');

    // Search by case number
    const searchRes = await request(app)
      .get('/api/hearings?caseNumber=RCS/123/2025')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(searchRes.status === 200, 'Search hearings by case number returned HTTP 200');
    assert(searchRes.body.data.hearings.length === 2, 'Found 2 hearings for RCS/123/2025');

    // Search by client
    const searchClientRes = await request(app)
      .get('/api/hearings?client=Rahul')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(searchClientRes.status === 200, 'Search hearings by client returned HTTP 200');
    assert(searchClientRes.body.data.hearings.length >= 2, 'Found hearings matching client');

    // Filter by court
    const courtFilterRes = await request(app)
      .get('/api/hearings?court=City%20Civil')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(courtFilterRes.status === 200, 'Filter hearings by court returned HTTP 200');
    assert(courtFilterRes.body.data.hearings.length === 1, 'Found 1 hearing in City Civil Court');

    console.log('\n======================================================');
    console.log(` PHASE 3 RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Phase 3 test suite runtime error:', err);
    process.exit(1);
  } finally {
    await closeDB();
  }
};

runPhase3Tests();

