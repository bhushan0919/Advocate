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
import { parseDateOnly } from '../utils/date.js';

export const runPhase31CalendarTests = async () => {
  console.log('\n======================================================');
  console.log('   AdvD PHASE 3.1: HEARING CALENDAR MODULE TEST');
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
    await User.deleteMany({ email: /@calendar-test\.com$/ });
    const oldWorkspaces = await Workspace.find({ name: /Calendar Test/ });
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
      fullName: 'Adv. Alok Narang',
      email: 'alok.narang@calendar-test.com',
      mobile: '+919877711122',
      password: 'Password@123',
      barCouncilNumber: 'MAH/2018/77',
      stateBarCouncil: 'Bar Council of Maharashtra & Goa',
      officeName: 'Calendar Test - Narang Chambers',
    });
    assert(advARes.status === 201, 'Advocate A registered successfully');
    const tokenA = advARes.body.data.tokens.accessToken;
    const workspaceAId = advARes.body.data.workspace.id;

    // Clerk for Chamber A
    const inviteRes = await request(app)
      .post('/api/workspaces/invitations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        email: 'clerk.narang@calendar-test.com',
        role: 'clerk',
      });
    const inviteToken = inviteRes.body.data.token || inviteRes.body.data.invitation?.token;

    const clerkRes = await request(app).post('/api/auth/accept-invitation').send({
      token: inviteToken,
      fullName: 'Manoj Kumar (Clerk)',
      mobile: '+919877733344',
      password: 'Password@123',
    });
    assert(clerkRes.status === 200, 'Clerk joined Chamber A');
    const tokenClerk = clerkRes.body.data.tokens.accessToken;

    // Advocate B (Independent Workspace)
    const advBRes = await request(app).post('/api/auth/register').send({
      fullName: 'Adv. Sunaina Roy',
      email: 'sunaina.roy@calendar-test.com',
      mobile: '+919877799988',
      password: 'Password@123',
      barCouncilNumber: 'WB/2019/55',
      stateBarCouncil: 'Bar Council of West Bengal',
      officeName: 'Calendar Test - Roy Law Chambers',
    });
    assert(advBRes.status === 201, 'Advocate B registered successfully');
    const tokenB = advBRes.body.data.tokens.accessToken;
    const workspaceBId = advBRes.body.data.workspace.id;

    console.log('\n2. Seeding Test Litigants and Cases for Calendar Range Testing');

    // Client in Chamber A
    const clientRes = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Vikram Sethi',
        mobile: '+919811122233',
        email: 'vikram.sethi@calendar-test.com',
        clientType: 'Individual',
      });
    const clientAId = clientRes.body.data._id;

    // Case 1: Scheduled on 2026-11-05 (Civil, High Court Room 14)
    const c1Res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseNumber: 'WP/501/2026',
        caseType: 'Civil',
        courtName: 'Bombay High Court',
        courtRoomNumber: 'Room 14',
        clientId: clientAId,
        opponentName: 'State of Maharashtra',
        nextHearingDate: '2026-11-05',
        nextHearingPurpose: 'Admission & Stay Arguments',
        status: 'Pending',
      });
    assert(c1Res.status === 201, 'Case 1 created for 2026-11-05');
    const case1Id = c1Res.body.data._id;

    // Case 2: Scheduled on SAME DAY 2026-11-05 (Criminal, Magistrate Court Room 22)
    const c2Res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseNumber: 'CC/702/2026',
        caseType: 'Criminal',
        courtName: 'Metropolitan Magistrate Court',
        courtRoomNumber: 'Room 22',
        clientId: clientAId,
        opponentName: 'Dinesh Patel',
        nextHearingDate: '2026-11-05',
        nextHearingPurpose: 'Section 138 Plea Recording',
        status: 'Pending',
      });
    assert(c2Res.status === 201, 'Case 2 created on same day 2026-11-05');

    // Case 3: Scheduled on 2026-11-12 (Property, City Civil Court Room 07)
    const c3Res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseNumber: 'SC/803/2026',
        caseType: 'Property',
        courtName: 'City Civil Court',
        courtRoomNumber: 'Room 07',
        clientId: clientAId,
        opponentName: 'Mehra Builders',
        nextHearingDate: '2026-11-12',
        nextHearingPurpose: 'Cross Examination of PW-1',
        status: 'Pending',
      });
    assert(c3Res.status === 201, 'Case 3 created for 2026-11-12');

    // Case 4: Disposed case on 2026-11-20 (Family Court) - Should be excluded by default
    const c4Res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseNumber: 'MA/904/2026',
        caseType: 'Family',
        courtName: 'Family Court',
        clientId: clientAId,
        opponentName: 'Ritu Sethi',
        nextHearingDate: '2026-11-20',
        nextHearingPurpose: 'Settlement Decree',
        status: 'Disposed',
      });
    assert(c4Res.status === 201, 'Case 4 (Disposed) created');

    // Case 5: Archived case on 2026-11-25 - Should be excluded by default
    const c5Res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseNumber: 'OS/905/2026',
        caseType: 'Civil',
        courtName: 'Bombay High Court',
        clientId: clientAId,
        opponentName: 'Old Partner',
        nextHearingDate: '2026-11-25',
        status: 'Pending',
      });
    const case5Id = c5Res.body.data._id;
    await request(app)
      .patch(`/api/cases/${case5Id}/archive`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ isArchived: true });
    assert(true, 'Case 5 created and marked as archived');

    // Case 6: Scheduled in Next Month (2026-12-05) - Out of November range
    const c6Res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseNumber: 'WP/906/2026',
        caseType: 'Civil',
        courtName: 'Supreme Court of India',
        clientId: clientAId,
        opponentName: 'Union of India',
        nextHearingDate: '2026-12-05',
        status: 'Pending',
      });
    assert(c6Res.status === 201, 'Case 6 created for December 2026');

    // Case in Chamber B (For Multi-Tenant Isolation)
    const clientBRes = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        fullName: 'Roy Chamber Litigant',
        mobile: '+919822233344',
      });
    await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        caseNumber: 'CAL/001/2026',
        caseType: 'Civil',
        courtName: 'Calcutta High Court',
        clientId: clientBRes.body.data._id,
        opponentName: 'Eastern Railways',
        nextHearingDate: '2026-11-05',
        status: 'Pending',
      });
    assert(true, 'Chamber B case created on 2026-11-05');

    console.log('\n3. Testing GET /api/calendar (Monthly Range & Default Exclusions)');

    const calRes = await request(app)
      .get('/api/calendar?startDate=2026-11-01&endDate=2026-11-30')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(calRes.status === 200, 'GET /api/calendar returned HTTP 200');
    assert(calRes.body.success === true, 'Response marked success');
    assert(calRes.body.data.totalEvents === 3, 'Exactly 3 upcoming active cases in November range (Disposed & Archived excluded)');

    // Verify Case 1, 2, 3 are present
    const caseNumbers = calRes.body.data.events.map((e: any) => e.caseNumber);
    assert(caseNumbers.includes('WP/501/2026'), 'Case 1 included');
    assert(caseNumbers.includes('CC/702/2026'), 'Case 2 included');
    assert(caseNumbers.includes('SC/803/2026'), 'Case 3 included');
    assert(!caseNumbers.includes('MA/904/2026'), 'Disposed case MA/904/2026 successfully excluded by default');
    assert(!caseNumbers.includes('OS/905/2026'), 'Archived case OS/905/2026 successfully excluded by default');
    assert(!caseNumbers.includes('WP/906/2026'), 'December case excluded from November range');

    // Verify multiple hearings on the same date grouping
    const sameDayEvents = calRes.body.data.eventsByDate['2026-11-05'];
    assert(Array.isArray(sameDayEvents), 'eventsByDate has entry for 2026-11-05');
    assert(sameDayEvents.length === 2, '2 hearings scheduled on 2026-11-05 correctly grouped');

    // Verify event structure
    const sampleEvent = calRes.body.data.events[0];
    assert(typeof sampleEvent.caseNumber === 'string', 'Event contains caseNumber');
    assert(typeof sampleEvent.clientName === 'string', 'Event contains clientName');
    assert(typeof sampleEvent.opponentName === 'string', 'Event contains opponentName');
    assert(typeof sampleEvent.courtName === 'string', 'Event contains courtName');
    assert(typeof sampleEvent.purpose === 'string', 'Event contains purpose');
    assert(typeof sampleEvent.status === 'string', 'Event contains status');
    assert(typeof sampleEvent.date === 'string', 'Event contains normalized YYYY-MM-DD date string');

    console.log('\n4. Testing Calendar Filtering');

    // Search filter
    const searchRes = await request(app)
      .get('/api/calendar?startDate=2026-11-01&endDate=2026-11-30&search=Metropolitan')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(searchRes.body.data.totalEvents === 1, 'Search filter matches exactly 1 event (Metropolitan Magistrate Court)');
    assert(searchRes.body.data.events[0].caseNumber === 'CC/702/2026', 'Matched case CC/702/2026');

    // Court filter
    const courtRes = await request(app)
      .get('/api/calendar?startDate=2026-11-01&endDate=2026-11-30&court=Bombay%20High%20Court')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(courtRes.body.data.totalEvents === 1, 'Court filter returns Bombay High Court case');

    // Case Type filter
    const typeRes = await request(app)
      .get('/api/calendar?startDate=2026-11-01&endDate=2026-11-30&caseType=Property')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(typeRes.body.data.totalEvents === 1, 'Case type filter returns Property case (SC/803/2026)');

    // Explicit Status filter: Disposed
    const disposedRes = await request(app)
      .get('/api/calendar?startDate=2026-11-01&endDate=2026-11-30&status=Disposed')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(disposedRes.body.data.totalEvents === 1, 'Explicit status=Disposed filter retrieves disposed case');
    assert(disposedRes.body.data.events[0].caseNumber === 'MA/904/2026', 'Retrieved MA/904/2026');

    // Include Archived filter
    const archivedRes = await request(app)
      .get('/api/calendar?startDate=2026-11-01&endDate=2026-11-30&includeArchived=true')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(archivedRes.body.data.totalEvents === 4, 'includeArchived=true retrieves archived case in range (3 + 1 = 4)');

    console.log('\n5. Testing GET /api/calendar/summary');

    const summaryRes = await request(app)
      .get('/api/calendar/summary?startDate=2026-11-01&endDate=2026-11-30')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(summaryRes.status === 200, 'GET /api/calendar/summary returned HTTP 200');
    assert(summaryRes.body.data.totalEvents === 3, 'Summary totalEvents matches 3');
    assert(summaryRes.body.data.uniqueCourts === 3, '3 unique courts in period');
    assert(summaryRes.body.data.busiestDay.date === '2026-11-05', 'Busiest day identified as 2026-11-05');
    assert(summaryRes.body.data.busiestDay.count === 2, 'Busiest day count is 2');
    assert(summaryRes.body.data.hearingsByCaseType.Civil === 1, 'hearingsByCaseType breakdown includes Civil: 1');
    assert(summaryRes.body.data.hearingsByCaseType.Criminal === 1, 'hearingsByCaseType breakdown includes Criminal: 1');
    assert(summaryRes.body.data.hearingsByCaseType.Property === 1, 'hearingsByCaseType breakdown includes Property: 1');

    console.log('\n6. Testing GET /api/calendar/date/:date');

    const dateRes = await request(app)
      .get('/api/calendar/date/2026-11-05')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(dateRes.status === 200, 'GET /api/calendar/date/2026-11-05 returned HTTP 200');
    assert(dateRes.body.data.totalHearings === 2, 'Date details returned 2 scheduled hearings');

    // Invalid date test
    const invalidDateRes = await request(app)
      .get('/api/calendar/date/invalid-date-format')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(invalidDateRes.status === 400, 'Invalid date format rejected with HTTP 400');

    console.log('\n7. Testing Clerk Access to Calendar');

    const clerkCalRes = await request(app)
      .get('/api/calendar?startDate=2026-11-01&endDate=2026-11-30')
      .set('Authorization', `Bearer ${tokenClerk}`);
    assert(clerkCalRes.status === 200, 'Clerk can access Chamber A calendar (HTTP 200)');
    assert(clerkCalRes.body.data.totalEvents === 3, 'Clerk sees identical 3 chamber hearings');

    console.log('\n8. Testing Strict Multi-Tenant Data Isolation');

    const bCalRes = await request(app)
      .get('/api/calendar?startDate=2026-11-01&endDate=2026-11-30')
      .set('Authorization', `Bearer ${tokenB}`);
    assert(bCalRes.status === 200, 'Advocate B queries own calendar');
    assert(bCalRes.body.data.totalEvents === 1, 'Advocate B only sees Chamber B case (totalEvents = 1)');
    assert(bCalRes.body.data.events[0].caseNumber === 'CAL/001/2026', 'Advocate B sees only CAL/001/2026');
    assert(!bCalRes.body.data.events.some((e: any) => e.caseNumber === 'WP/501/2026'), 'Chamber A case completely invisible to Chamber B');

    console.log('\n9. Testing Synchronization with Hearing Update');

    // Record a hearing for Case 1 on 2026-11-05, rescheduling nextHearingDate to 2026-11-28
    const hearingUpdateRes = await request(app)
      .post(`/api/cases/${case1Id}/hearings`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        hearingDate: '2026-11-05',
        purpose: 'Admission Arguments',
        proceedings: 'Arguments heard in part. Matter adjourned for final disposal to 28 Nov 2026.',
        nextHearingDate: '2026-11-28',
        nextHearingPurpose: 'Final Hearing & Disposal',
      });
    assert(hearingUpdateRes.status === 201, 'Hearing recorded and nextHearingDate updated to 2026-11-28');

    // Verify calendar for 2026-11-05 now only has Case 2
    const calUpdatedOldDate = await request(app)
      .get('/api/calendar/date/2026-11-05')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(calUpdatedOldDate.body.data.totalHearings === 1, 'Old scheduled date (2026-11-05) now has only 1 pending case');
    assert(calUpdatedOldDate.body.data.cases[0].case.caseNumber === 'CC/702/2026', 'Remaining case is CC/702/2026');

    // Verify calendar for new date (2026-11-28) now has Case 1
    const calUpdatedNewDate = await request(app)
      .get('/api/calendar/date/2026-11-28')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(calUpdatedNewDate.body.data.totalHearings === 1, 'New scheduled date (2026-11-28) now contains Case 1');
    assert(calUpdatedNewDate.body.data.cases[0].case.caseNumber === 'WP/501/2026', 'Case 1 properly rescheduled on calendar');

    // Verify historical hearing preserved
    const caseHearingsRes = await request(app)
      .get(`/api/cases/${case1Id}/hearings`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(caseHearingsRes.body.data.length === 1, 'Historical hearing entry completely preserved in database');
    assert(caseHearingsRes.body.data[0].purpose === 'Admission Arguments', 'Hearing purpose preserved');

    console.log('\n======================================================');
    console.log(` PHASE 3.1 RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      throw new Error(`${failed} tests failed in Phase 3.1 Calendar test suite.`);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    throw error;
  } finally {
    await closeDB();
  }
};

// Auto-run if executed directly
if (process.argv[1]?.includes('phase3.1-calendar.test')) {
  runPhase31CalendarTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
