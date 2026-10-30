import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMembership } from '../models/WorkspaceMembership.js';
import { Invitation } from '../models/Invitation.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ActivityLog } from '../models/ActivityLog.js';

const runTests = async () => {
  console.log('\n======================================================');
  console.log('   AdvD MULTI-TENANT ISOLATION & AUTH TEST SUITE');
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
    // Clean test database for fresh run
    await User.deleteMany({ email: /@test-advd\.com$/ });
    await RefreshToken.deleteMany({});
    const testWorkspaces = await Workspace.find({ name: /Test Chamber/ });
    const wsIds = testWorkspaces.map((w) => w._id);
    await Workspace.deleteMany({ _id: { $in: wsIds } });
    await WorkspaceMembership.deleteMany({ workspaceId: { $in: wsIds } });
    await Invitation.deleteMany({ workspaceId: { $in: wsIds } });
    await ActivityLog.deleteMany({ workspaceId: { $in: wsIds } });

    console.log('1. Testing Advocate A Registration & Workspace Provisioning');
    const advARes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Advocate Rajesh Sharma',
        email: 'rajesh.sharma@test-advd.com',
        mobile: '+919876543210',
        password: 'Password@123',
        barCouncilNumber: 'MAH/1042/2012',
        stateBarCouncil: 'Bar Council of Maharashtra & Goa',
        officeName: 'Test Chamber - Sharma & Associates',
      });

    assert(advARes.status === 201, 'Advocate A registered with HTTP 201');
    assert(!!advARes.body.data.workspace.id, 'Workspace A was created');
    assert(advARes.body.data.workspace.role === 'owner', 'Advocate A is owner of Workspace A');
    const tokenA = advARes.body.data.tokens.accessToken;
    const refreshTokenA = advARes.body.data.tokens.refreshToken;
    const workspaceAId = advARes.body.data.workspace.id;

    console.log('\n2. Testing Advocate B Registration & Workspace Provisioning');
    const advBRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Advocate Priya Deshmukh',
        email: 'priya.deshmukh@test-advd.com',
        mobile: '+919876543211',
        password: 'Password@456',
        barCouncilNumber: 'MAH/5821/2016',
        stateBarCouncil: 'Bar Council of Maharashtra & Goa',
        officeName: 'Test Chamber - Deshmukh Legal',
      });

    assert(advBRes.status === 201, 'Advocate B registered with HTTP 201');
    assert(!!advBRes.body.data.workspace.id, 'Workspace B was created');
    const tokenB = advBRes.body.data.tokens.accessToken;
    const workspaceBId = advBRes.body.data.workspace.id;
    assert(workspaceAId !== workspaceBId, 'Workspace A and Workspace B have distinct IDs');

    console.log('\n3. Testing Advocate A inviting a Clerk');
    const inviteRes = await request(app)
      .post('/api/workspaces/invitations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        email: 'suresh.clerk@test-advd.com',
        role: 'clerk',
      });

    assert(inviteRes.status === 201, 'Clerk invitation generated with HTTP 201');
    assert(!!inviteRes.body.data.token, 'Invitation contains secure expiring token');
    const inviteToken = inviteRes.body.data.token;

    console.log('\n4. Testing Clerk Invitation Verification');
    const verifyInviteRes = await request(app)
      .get(`/api/auth/verify-invitation?token=${inviteToken}`);

    assert(verifyInviteRes.status === 200, 'Invitation verified with HTTP 200');
    assert(
      verifyInviteRes.body.data.email === 'suresh.clerk@test-advd.com',
      'Invitation email matches'
    );
    assert(
      verifyInviteRes.body.data.workspace.id === workspaceAId,
      'Invitation is strictly bound to Workspace A'
    );

    console.log('\n5. Testing Clerk Accepting Invitation (Joining Workspace A)');
    const acceptRes = await request(app)
      .post('/api/auth/accept-invitation')
      .send({
        token: inviteToken,
        fullName: 'Suresh Verma (Clerk)',
        mobile: '+919876543212',
        password: 'ClerkPassword@123',
      });

    assert(acceptRes.status === 200, 'Clerk accepted invitation with HTTP 200');
    assert(
      acceptRes.body.data.workspace.id === workspaceAId,
      'Clerk joined Workspace A'
    );
    assert(acceptRes.body.data.workspace.role === 'clerk', 'Clerk role assigned');
    const clerkToken = acceptRes.body.data.tokens.accessToken;

    console.log('\n6. Checking Clerk Cannot Create an Independent Workspace');
    // Clerk should have only membership in Workspace A, no owned workspaces
    const clerkMemberships = await WorkspaceMembership.find({
      userId: acceptRes.body.data.user.id,
    });
    assert(clerkMemberships.length === 1, 'Clerk has exactly 1 membership');
    assert(clerkMemberships[0].role === 'clerk', 'Clerk has clerk role, not owner');

    console.log('\n7. Testing STRICT MULTI-TENANT ISOLATION');
    // Test 7a: Advocate A tries to access Workspace B members by spoofing x-workspace-id
    const crossAccessRes1 = await request(app)
      .get('/api/workspaces/members')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-workspace-id', workspaceBId);

    assert(
      crossAccessRes1.status === 403,
      'Advocate A spoofing Workspace B id is REJECTED with HTTP 403 Forbidden',
      `Got status: ${crossAccessRes1.status}`
    );

    // Test 7b: Advocate B tries to access Workspace A members
    const crossAccessRes2 = await request(app)
      .get('/api/workspaces/members')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-workspace-id', workspaceAId);

    assert(
      crossAccessRes2.status === 403,
      'Advocate B spoofing Workspace A id is REJECTED with HTTP 403 Forbidden',
      `Got status: ${crossAccessRes2.status}`
    );

    // Test 7c: Clerk A1 tries to access Workspace B members
    const crossAccessRes3 = await request(app)
      .get('/api/workspaces/members')
      .set('Authorization', `Bearer ${clerkToken}`)
      .set('x-workspace-id', workspaceBId);

    assert(
      crossAccessRes3.status === 403,
      'Clerk A1 spoofing Workspace B id is REJECTED with HTTP 403 Forbidden',
      `Got status: ${crossAccessRes3.status}`
    );

    // Test 7d: Advocate A legitimately accesses Workspace A members
    const legitRes = await request(app)
      .get('/api/workspaces/members')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(legitRes.status === 200, 'Advocate A legitimately accesses Workspace A members');
    assert(legitRes.body.data.length === 2, 'Workspace A has 2 members (Advocate A + Clerk A1)');

    // Test 7e: Advocate B legitimately accesses Workspace B members
    const legitBRes = await request(app)
      .get('/api/workspaces/members')
      .set('Authorization', `Bearer ${tokenB}`);

    assert(legitBRes.status === 200, 'Advocate B legitimately accesses Workspace B members');
    assert(legitBRes.body.data.length === 1, 'Workspace B has 1 member (Advocate B only)');

    console.log('\n8. Testing Token Refresh & Rotation');
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshTokenA });

    assert(refreshRes.status === 200, 'Token refreshed successfully with HTTP 200');
    assert(!!refreshRes.body.data.accessToken, 'New access token issued');
    assert(!!refreshRes.body.data.refreshToken, 'New rotated refresh token issued');

    // Test old refresh token is now revoked
    const reuseRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshTokenA });

    assert(reuseRes.status === 401, 'Reusing revoked refresh token is REJECTED with HTTP 401');

    console.log('\n======================================================');
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite runtime error:', err);
    process.exit(1);
  } finally {
    await closeDB();
  }
};

runTests();

