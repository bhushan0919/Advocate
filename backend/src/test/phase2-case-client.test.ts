import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMembership } from '../models/WorkspaceMembership.js';
import { Client } from '../models/Client.js';
import { Case } from '../models/Case.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Invitation } from '../models/Invitation.js';

export const runPhase2Tests = async () => {
  console.log('\n======================================================');
  console.log('   AdvD PHASE 2: CASE & CLIENT MANAGEMENT TEST SUITE');
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
    await User.deleteMany({ email: /@phase2-test\.com$/ });
    const oldWorkspaces = await Workspace.find({ name: /Phase 2 Test/ });
    const wsIds = oldWorkspaces.map((w) => w._id);
    await Workspace.deleteMany({ _id: { $in: wsIds } });
    await WorkspaceMembership.deleteMany({ workspaceId: { $in: wsIds } });
    await Client.deleteMany({ workspaceId: { $in: wsIds } });
    await Case.deleteMany({ workspaceId: { $in: wsIds } });
    await ActivityLog.deleteMany({ workspaceId: { $in: wsIds } });
    await Invitation.deleteMany({ workspaceId: { $in: wsIds } });

    console.log('1. Setting up Test Workspaces: Chamber A & Chamber B');

    // Setup Advocate A
    const advARes = await request(app).post('/api/auth/register').send({
      fullName: 'Adv. Alok Verma',
      email: 'alok.verma@phase2-test.com',
      mobile: '+919811122233',
      password: 'Password@123',
      barCouncilNumber: 'D/1234/2015',
      stateBarCouncil: 'Bar Council of Delhi',
      officeName: 'Phase 2 Test - Verma Chambers',
    });
    assert(advARes.status === 201, 'Advocate A registered successfully');
    const tokenA = advARes.body.data.tokens.accessToken;
    const workspaceAId = advARes.body.data.workspace.id;

    // Setup Advocate B
    const advBRes = await request(app).post('/api/auth/register').send({
      fullName: 'Adv. Brijesh Nair',
      email: 'brijesh.nair@phase2-test.com',
      mobile: '+919811122244',
      password: 'Password@123',
      barCouncilNumber: 'KER/5678/2018',
      stateBarCouncil: 'Bar Council of Kerala',
      officeName: 'Phase 2 Test - Nair Law Associates',
    });
    assert(advBRes.status === 201, 'Advocate B registered successfully');
    const tokenB = advBRes.body.data.tokens.accessToken;
    const workspaceBId = advBRes.body.data.workspace.id;

    // Invite Clerk into Chamber A
    const inviteRes = await request(app)
      .post('/api/workspaces/invitations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        email: 'clerk.ramesh@phase2-test.com',
        role: 'clerk',
      });
    const inviteToken = inviteRes.body.data.token;

    const acceptRes = await request(app).post('/api/auth/accept-invitation').send({
      token: inviteToken,
      fullName: 'Ramesh Kumar (Clerk)',
      mobile: '+919811122255',
      password: 'Password@123',
    });
    assert(acceptRes.status === 200, 'Clerk joined Chamber A');
    const clerkTokenA = acceptRes.body.data.tokens.accessToken;
    const clerkUserIdA = acceptRes.body.data.user.id;

    console.log('\n2. Testing Client Creation & Duplicate Prevention');

    // Client 1 in Chamber A
    const client1Res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Kailash Singhania',
        mobile: '+919870000001',
        email: 'kailash@singhania.in',
        address: '42 Nariman Point, Mumbai',
        clientType: 'Corporate',
        notes: 'Important long-standing commercial litigation client',
      });
    assert(client1Res.status === 201, 'Client 1 created by Advocate A with HTTP 201');
    assert(client1Res.body.data.fullName === 'Kailash Singhania', 'Client full name matches');
    const client1Id = client1Res.body.data._id;

    // Duplicate client mobile test
    const dupMobileRes = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Kailash S (Duplicate)',
        mobile: '+919870000001',
        email: 'kailash.other@singhania.in',
      });
    assert(dupMobileRes.status === 409, 'Duplicate mobile number in same workspace rejected with HTTP 409');

    // Duplicate client email test
    const dupEmailRes = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Kailash Another',
        mobile: '+919870000002',
        email: 'kailash@singhania.in',
      });
    assert(dupEmailRes.status === 409, 'Duplicate email in same workspace rejected with HTTP 409');

    // Client 2 in Chamber A (Individual)
    const client2Res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Meera Kulkarni',
        mobile: '+919870000003',
        email: 'meera.kulkarni@gmail.com',
        clientType: 'Individual',
        notes: 'Family dispute case',
      });
    assert(client2Res.status === 201, 'Client 2 created in Chamber A');
    const client2Id = client2Res.body.data._id;

    // Client in Chamber B (same mobile allowed across different workspaces)
    const clientBRes = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        fullName: 'Same Mobile In Chamber B',
        mobile: '+919870000001', // Same mobile as Client 1 in Chamber A
        clientType: 'Individual',
      });
    assert(clientBRes.status === 201, 'Same mobile is permitted in a distinct workspace (multi-tenant isolated)');
    const clientBId = clientBRes.body.data._id;

    console.log('\n3. Testing Client Permissions for Clerk');
    // Clerk in Chamber A tries to create a client (default clerk only has clients:read)
    const clerkCreateClientRes = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${clerkTokenA}`)
      .send({
        fullName: 'Clerk Litigant',
        mobile: '+919870000099',
      });
    assert(
      clerkCreateClientRes.status === 403,
      'Clerk restricted from creating clients (HTTP 403 Forbidden)'
    );

    // Clerk CAN read clients
    const clerkGetClientsRes = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${clerkTokenA}`);
    assert(
      clerkGetClientsRes.status === 200,
      'Clerk can read clients list (HTTP 200 OK)'
    );

    console.log('\n4. Testing Client Listing, Searching & Pagination');
    const listRes = await request(app)
      .get('/api/clients?search=Meera')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(listRes.status === 200, 'Search clients returned HTTP 200');
    assert(listRes.body.data.clients.length === 1, 'Search returned exactly 1 matching client');
    assert(listRes.body.data.clients[0].fullName === 'Meera Kulkarni', 'Matched Meera Kulkarni');

    console.log('\n5. Testing Case Creation & Validations');

    // Case 1 in Chamber A
    const case1Res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseNumber: 'WP/2026/101',
        cnrNumber: 'MHCB010023452026',
        caseType: 'Civil',
        courtName: 'Bombay High Court',
        courtLocation: 'Fort, Mumbai',
        courtRoomNumber: 'Room 14',
        clientId: client1Id,
        opponentName: 'Municipal Corporation of Greater Mumbai',
        opponentAdvocate: 'Adv. S. K. Mehta',
        filingDate: '2026-01-15',
        previousHearingDate: '2026-02-10',
        nextHearingDate: '2026-11-20',
        nextHearingPurpose: 'Admission & Interim Relief',
        status: 'Pending',
        assignedClerkId: clerkUserIdA,
        caseDescription: 'Challenge to illegal demolition notice under MMC Act Section 351',
      });

    assert(case1Res.status === 201, 'Case 1 created by Advocate A with HTTP 201');
    assert(case1Res.body.data.clientName === 'Kailash Singhania', 'Client name snapshot stored in case');
    assert(case1Res.body.data.assignedClerkId?._id === clerkUserIdA, 'Clerk assigned to case');
    const case1Id = case1Res.body.data._id;

    // Duplicate case number in same workspace
    const dupCaseRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseNumber: 'WP/2026/101',
        courtName: 'City Civil Court',
        clientId: client1Id,
        opponentName: 'XYZ Ltd',
      });
    assert(dupCaseRes.status === 409, 'Duplicate case number in same workspace rejected with HTTP 409');

    // Case with same caseNumber in Chamber B should be allowed
    const caseBRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        caseNumber: 'WP/2026/101', // Same caseNumber as Chamber A
        courtName: 'Kerala High Court',
        clientId: clientBId,
        opponentName: 'State of Kerala',
      });
    assert(caseBRes.status === 201, 'Identical case number permitted in different workspace (multi-tenant isolated)');

    console.log('\n6. Testing Cross-Workspace Reference Boundary Validation');

    // Advocate A tries to reference Client B from Chamber B
    const crossClientRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseNumber: 'WP/2026/999',
        courtName: 'High Court',
        clientId: clientBId, // Chamber B's client!
        opponentName: 'Test Opponent',
      });
    assert(
      crossClientRes.status === 400,
      'Referencing client from another workspace is rejected with HTTP 400 Bad Request'
    );

    // Advocate B tries to assign Clerk A1 from Chamber A
    const crossClerkRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        caseNumber: 'KL/2026/505',
        courtName: 'District Court',
        clientId: clientBId,
        opponentName: 'Test Opponent',
        assignedClerkId: clerkUserIdA, // Chamber A's clerk!
      });
    assert(
      crossClerkRes.status === 400,
      'Assigning clerk from another workspace is rejected with HTTP 400 Bad Request'
    );

    console.log('\n7. Testing Clerk Permitted Case Operations');

    // Clerk in Chamber A can create a case (clerk has cases:write)
    const clerkCaseRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${clerkTokenA}`)
      .send({
        caseNumber: 'CC/2026/303',
        cnrNumber: 'MHMM020011112026',
        caseType: 'Criminal',
        courtName: 'Metropolitan Magistrate Court',
        courtRoomNumber: 'Court 28',
        clientId: client2Id,
        opponentName: 'Rohit Sharma & Ors',
        status: 'Pending',
        nextHearingDate: '2026-12-05',
        nextHearingPurpose: 'Verification of Complainant',
      });
    assert(clerkCaseRes.status === 201, 'Clerk successfully registered case (HTTP 201)');
    const clerkCaseId = clerkCaseRes.body.data._id;

    // Clerk can update case
    const clerkUpdateCaseRes = await request(app)
      .put(`/api/cases/${clerkCaseId}`)
      .set('Authorization', `Bearer ${clerkTokenA}`)
      .send({
        nextHearingPurpose: 'Summons Issued to Accused',
      });
    assert(clerkUpdateCaseRes.status === 200, 'Clerk successfully updated case details (HTTP 200)');
    assert(
      clerkUpdateCaseRes.body.data.nextHearingPurpose === 'Summons Issued to Accused',
      'Updated hearing purpose verified'
    );

    console.log('\n8. Testing Case Searching & Filtering');

    // Search by case number
    const searchByNoRes = await request(app)
      .get('/api/cases?caseNumber=WP/2026/101')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(searchByNoRes.status === 200, 'Search by caseNumber returns 200');
    assert(searchByNoRes.body.data.cases.length === 1, 'Found 1 case by caseNumber');

    // Search by CNR
    const searchByCnrRes = await request(app)
      .get('/api/cases?cnrNumber=MHCB010023452026')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(searchByCnrRes.status === 200, 'Search by CNR returns 200');
    assert(searchByCnrRes.body.data.cases.length === 1, 'Found 1 case by CNR');

    // Search by opponent
    const searchByOppRes = await request(app)
      .get('/api/cases?opponent=Municipal')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(searchByOppRes.status === 200, 'Search by opponent returns 200');
    assert(searchByOppRes.body.data.cases.length === 1, 'Found 1 case by opponent');

    // Filter by court
    const filterCourtRes = await request(app)
      .get('/api/cases?court=Metropolitan')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(filterCourtRes.status === 200, 'Filter by court returns 200');
    assert(filterCourtRes.body.data.cases.length === 1, 'Found 1 case in Metropolitan Magistrate');

    // Filter by case type
    const filterTypeRes = await request(app)
      .get('/api/cases?caseType=Criminal')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(filterTypeRes.status === 200, 'Filter by caseType returns 200');
    assert(filterTypeRes.body.data.cases[0].caseType === 'Criminal', 'Filtered case is Criminal');

    // Filter by hearing date
    const filterDateRes = await request(app)
      .get('/api/cases?hearingDate=2026-11-20')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(filterDateRes.status === 200, 'Filter by hearingDate returns 200');
    assert(filterDateRes.body.data.cases.length === 1, 'Found 1 case on 2026-11-20');

    // General multi-field search bar
    const generalSearchRes = await request(app)
      .get('/api/cases?search=Singhania')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(generalSearchRes.status === 200, 'General search returns 200');
    assert(generalSearchRes.body.data.cases.length === 1, 'Found case for Singhania via general search');

    console.log('\n9. Testing Case Archiving & Archive Filtering');
    const archiveRes = await request(app)
      .patch(`/api/cases/${case1Id}/archive`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(archiveRes.status === 200, 'Case archived with HTTP 200');
    assert(archiveRes.body.data.isArchived === true, 'Case isArchived is now true');

    // Active cases listing should not show archived case
    const activeCasesRes = await request(app)
      .get('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(
      !activeCasesRes.body.data.cases.some((c: any) => c._id === case1Id),
      'Archived case excluded from default active case register'
    );

    // Filter archived cases only
    const archivedListRes = await request(app)
      .get('/api/cases?isArchived=true')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(
      archivedListRes.body.data.cases.some((c: any) => c._id === case1Id),
      'Archived case present in isArchived=true filter'
    );

    // Unarchive case
    const unarchiveRes = await request(app)
      .patch(`/api/cases/${case1Id}/archive`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ isArchived: false });
    assert(unarchiveRes.status === 200, 'Case restored from archive');
    assert(unarchiveRes.body.data.isArchived === false, 'Case isArchived is now false');

    console.log('\n10. Testing Client Profile Associated Cases');
    const clientProfileRes = await request(app)
      .get(`/api/clients/${client1Id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(clientProfileRes.status === 200, 'Client profile fetched with HTTP 200');
    assert(clientProfileRes.body.data.cases.length === 1, 'Client profile contains 1 associated case');
    assert(clientProfileRes.body.data.cases[0].caseNumber === 'WP/2026/101', 'Associated case matches');

    console.log('\n11. Testing Client Deletion vs Archival Protection');
    // Client 1 has a linked case -> deleting should archive it, not permanently delete!
    const deleteClientWithCasesRes = await request(app)
      .delete(`/api/clients/${client1Id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(deleteClientWithCasesRes.status === 200, 'Client with linked cases handled with HTTP 200');
    assert(
      deleteClientWithCasesRes.body.archived === true,
      'Client with linked cases is archived instead of deleted'
    );

    // Verify client record still exists in DB as archived
    const checkArchivedClient = await Client.findById(client1Id);
    assert(checkArchivedClient !== null && checkArchivedClient.isArchived === true, 'Client preserved in database as archived');

    // Create a client with no cases and delete
    const standaloneClientRes = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Temporary Client',
        mobile: '+919870000098',
      });
    const standaloneClientId = standaloneClientRes.body.data._id;

    const deleteStandaloneRes = await request(app)
      .delete(`/api/clients/${standaloneClientId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(deleteStandaloneRes.status === 200, 'Standalone client deleted with HTTP 200');
    assert(deleteStandaloneRes.body.archived === false, 'Standalone client permanently deleted');
    const checkDeleted = await Client.findById(standaloneClientId);
    assert(checkDeleted === null, 'Standalone client record removed from DB');

    console.log('\n12. Testing Strict Multi-Tenant Data Isolation');
    // Advocate B tries to access Client 1 from Chamber A
    const crossClientGetRes = await request(app)
      .get(`/api/clients/${client1Id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert(
      crossClientGetRes.status === 404,
      'Advocate B accessing Chamber A client is REJECTED with HTTP 404 Not Found'
    );

    // Advocate B tries to access Case 1 from Chamber A
    const crossCaseGetRes = await request(app)
      .get(`/api/cases/${case1Id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert(
      crossCaseGetRes.status === 404,
      'Advocate B accessing Chamber A case is REJECTED with HTTP 404 Not Found'
    );

    // Advocate B tries to update Case 1 from Chamber A
    const crossCasePutRes = await request(app)
      .put(`/api/cases/${case1Id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ courtName: 'Hacked Court' });
    assert(
      crossCasePutRes.status === 404,
      'Advocate B updating Chamber A case is REJECTED with HTTP 404 Not Found'
    );

    console.log('\n13. Testing Invalid ObjectIds & Unauthorized Requests');
    // Invalid ObjectId on Case GET
    const invalidCaseIdRes = await request(app)
      .get('/api/cases/invalid-non-object-id')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(invalidCaseIdRes.status === 400, 'Invalid Case ID format rejected with HTTP 400');

    // Invalid ObjectId on Client GET
    const invalidClientIdRes = await request(app)
      .get('/api/clients/not-an-id')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(invalidClientIdRes.status === 400, 'Invalid Client ID format rejected with HTTP 400');

    // Unauthorized request without token
    const noTokenRes = await request(app).get('/api/cases');
    assert(noTokenRes.status === 401, 'Request without token rejected with HTTP 401 Unauthorized');

    console.log('\n======================================================');
    console.log(` PHASE 2 RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Phase 2 test suite runtime error:', err);
    process.exit(1);
  } finally {
    await closeDB();
  }
};

runPhase2Tests();
