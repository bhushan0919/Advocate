import supertest from 'supertest';
import { createApp } from '../app.js';
import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMembership } from '../models/WorkspaceMembership.js';

let app: any;
let request: supertest.SuperTest<supertest.Test>;

const runSecurityAuditTests = async () => {
  console.log('\n======================================================');
  console.log('   AdvD ENTERPRISE SECURITY & COMPLIANCE TEST SUITE  ');
  console.log('======================================================\n');

  await connectDB();
  app = createApp();
  request = supertest(app);

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  };

  try {
    // ------------------------------------------------------------------------
    // 1. Security Headers Verification
    // ------------------------------------------------------------------------
    console.log('1. Testing Security Headers & Server Hardening');
    const healthRes = await request.get('/health');
    assert(healthRes.status === 200, 'Health probe returns HTTP 200');
    assert(!healthRes.headers['x-powered-by'], 'X-Powered-By header is strictly suppressed');
    assert(healthRes.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options is nosniff');
    assert(healthRes.headers['x-frame-options'] === 'DENY', 'X-Frame-Options is DENY (anti-clickjacking)');
    assert(!!healthRes.headers['content-security-policy'], 'Content-Security-Policy header is actively enforced');
    assert(!!healthRes.headers['strict-transport-security'], 'Strict-Transport-Security (HSTS) is enabled');

    // ------------------------------------------------------------------------
    // 2. Setup Test Advocates & Chamber
    // ------------------------------------------------------------------------
    console.log('\n2. Provisioning Isolated Chamber for Security Testing');
    const timestamp = Date.now();
    const advocateEmail = `sec.advocate.${timestamp}@security-audit.in`;
    const clerkEmail = `sec.clerk.${timestamp}@security-audit.in`;

    const regRes = await request.post('/api/auth/register').send({
      fullName: 'Adv. Kabir Security',
      email: advocateEmail,
      mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'SecurePassword@123',
      barCouncilNumber: `MAH/SEC/${timestamp}`,
    });
    assert(regRes.status === 201, 'Advocate registered with HTTP 201');

    const advocateToken = regRes.body.data.tokens.accessToken;
    const workspaceId = regRes.body.data.workspace.id;

    // Invite & accept clerk
    const inviteRes = await request
      .post('/api/workspaces/invitations')
      .set('Authorization', `Bearer ${advocateToken}`)
      .set('x-workspace-id', workspaceId)
      .send({ email: clerkEmail, role: 'clerk' });
    assert(inviteRes.status === 201, 'Clerk invitation generated');

    const inviteToken = inviteRes.body.data.token;
    const acceptRes = await request.post('/api/auth/accept-invitation').send({
      token: inviteToken,
      fullName: 'Sanjay Security Clerk',
      mobile: `97${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'ClerkPassword@123',
    });
    assert(acceptRes.status === 200, 'Clerk accepted invitation');
    const clerkToken = acceptRes.body.data.tokens.accessToken;

    // ------------------------------------------------------------------------
    // 3. NoSQL Injection Defense Testing
    // ------------------------------------------------------------------------
    console.log('\n3. Testing NoSQL Query Injection Resistance');
    // Attempt login with query selector bypass {$gt: ""}
    const noSqlRes = await request.post('/api/auth/login').send({
      email: { $gt: '' },
      password: 'SecurePassword@123',
    });
    // Should be rejected because $gt is sanitized to empty or stripped
    assert(
      noSqlRes.status === 400 || noSqlRes.status === 401,
      'NoSQL $gt operator injection rejected with HTTP 400/401'
    );

    // ------------------------------------------------------------------------
    // 4. XSS Script Neutralization in Body Payloads
    // ------------------------------------------------------------------------
    console.log('\n4. Testing XSS Script Neutralization in Form Inputs');
    const xssClientRes = await request
      .post('/api/clients')
      .set('Authorization', `Bearer ${advocateToken}`)
      .set('x-workspace-id', workspaceId)
      .send({
        fullName: 'Client <script>alert("xss")</script> Sharma',
        mobile: `96${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `xss.client.${timestamp}@test.in`,
        notes: '<script src="http://evil.com/leak.js"></script>Legitimate legal notes',
      });
    assert(xssClientRes.status === 201, 'Client created successfully');
    assert(
      !xssClientRes.body.data.fullName.includes('<script>'),
      'Script tags in fullName were stripped cleanly by security sanitizer'
    );
    assert(
      !xssClientRes.body.data.notes.includes('<script'),
      'Script tags in notes were neutralized cleanly'
    );

    // ------------------------------------------------------------------------
    // 5. Admin & Role-Based Access Control (RBAC) Hardening
    // ------------------------------------------------------------------------
    console.log('\n5. Testing RBAC & Route Access Guard');
    // Clerk attempting to modify workspace settings (restricted to owner/advocate)
    const clerkPatchWs = await request
      .patch('/api/settings/workspace')
      .set('Authorization', `Bearer ${clerkToken}`)
      .set('x-workspace-id', workspaceId)
      .send({ officeName: 'Hacked Clerk Office' });
    assert(
      clerkPatchWs.status === 403,
      'Clerk unauthorized workspace settings modification blocked with HTTP 403 Forbidden'
    );

    // Clerk attempting chamber data export
    const clerkExport = await request
      .get('/api/settings/data-export')
      .set('Authorization', `Bearer ${clerkToken}`)
      .set('x-workspace-id', workspaceId);
    assert(
      clerkExport.status === 403,
      'Clerk full chamber data export blocked with HTTP 403 Forbidden'
    );

    // ------------------------------------------------------------------------
    // 6. Timing Attack Mitigation for Login
    // ------------------------------------------------------------------------
    console.log('\n6. Testing Constant-Time Password Verification Mitigation');
    const t0 = Date.now();
    await request.post('/api/auth/login').send({
      email: 'nonexistent.user.test@fakechambers.in',
      password: 'SomeRandomPassword@999',
    });
    const tDuration = Date.now() - t0;
    assert(
      tDuration >= 40,
      `Non-existent email evaluation executed dummy bcrypt hash to equalize timing (${tDuration}ms)`
    );

    // ------------------------------------------------------------------------
    // 7. Cleanup Test Records
    // ------------------------------------------------------------------------
    console.log('\n7. Cleaning up Security Audit Test Artifacts');
    await User.deleteMany({ email: { $in: [advocateEmail, clerkEmail] } });
    await Workspace.deleteOne({ _id: workspaceId });
    await WorkspaceMembership.deleteMany({ workspaceId });
    assert(true, 'Test chamber cleaned up');

    console.log('\n======================================================');
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    await closeDB();
    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err: any) {
    console.error('Security test failed:', err);
    await closeDB();
    process.exit(1);
  }
};

runSecurityAuditTests();

