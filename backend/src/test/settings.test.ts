import mongoose from 'mongoose';
import request from 'supertest';
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
import { Reminder } from '../models/Reminder.js';

const runTests = async () => {
  console.log('\n======================================================');
  console.log('   AdvD SETTINGS FOUNDATION & SECURITY TEST SUITE');
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
    await User.deleteMany({ email: /@settings-test\.com$/ });
    await RefreshToken.deleteMany({});
    const testWorkspaces = await Workspace.find({ name: /Settings Chamber/ });
    const wsIds = testWorkspaces.map((w) => w._id);
    await Workspace.deleteMany({ _id: { $in: wsIds } });
    await WorkspaceMembership.deleteMany({ workspaceId: { $in: wsIds } });
    await ActivityLog.deleteMany({ workspaceId: { $in: wsIds } });
    await Case.deleteMany({ workspaceId: { $in: wsIds } });
    await Client.deleteMany({ workspaceId: { $in: wsIds } });
    await Hearing.deleteMany({ workspaceId: { $in: wsIds } });
    await Task.deleteMany({ workspaceId: { $in: wsIds } });
    await Reminder.deleteMany({ workspaceId: { $in: wsIds } });

    console.log('1. Setting up Advocate A, Clerk A, and Advocate B in independent workspaces');

    // Register Advocate A
    const advARes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Adv. Anjali Deshmukh',
        email: 'anjali@settings-test.com',
        mobile: '+919811122233',
        password: 'Password@123',
        barCouncilNumber: 'MAH/5555/2014',
        stateBarCouncil: 'Bar Council of Maharashtra & Goa',
        officeName: 'Settings Chamber A - Deshmukh Law Firm',
      });

    assert(advARes.status === 201, 'Advocate A registered with HTTP 201');
    const tokenA = advARes.body.data.tokens.accessToken;
    const wsAId = advARes.body.data.workspace.id;
    const userAId = advARes.body.data.user.id;

    // Register Advocate B (different chamber)
    const advBRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Adv. Vikram Batra',
        email: 'vikram@settings-test.com',
        mobile: '+919844455566',
        password: 'Password@123',
        barCouncilNumber: 'DEL/8888/2016',
        stateBarCouncil: 'Bar Council of Delhi',
        officeName: 'Settings Chamber B - Batra & Co',
      });

    assert(advBRes.status === 201, 'Advocate B registered in independent workspace B');
    const tokenB = advBRes.body.data.tokens.accessToken;
    const wsBId = advBRes.body.data.workspace.id;

    // Create Clerk in Chamber A
    const bcrypt = (await import('bcryptjs')).default;
    const clerkPasswordHash = await bcrypt.hash('Password@123', 10);
    const clerkUser = await User.create({
      fullName: 'Ramesh Clerk',
      email: 'ramesh.clerk@settings-test.com',
      mobile: '+919877788899',
      passwordHash: clerkPasswordHash,
      systemRole: 'user',
      status: 'active',
    });

    await WorkspaceMembership.create({
      workspaceId: wsAId,
      userId: clerkUser._id,
      role: 'clerk',
      status: 'active',
    });

    // Login Clerk to get Clerk token
    const clerkLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'ramesh.clerk@settings-test.com',
        password: 'Password@123',
        workspaceId: wsAId,
      });

    const clerkToken = clerkLoginRes.body.data.tokens.accessToken;
    assert(!!clerkToken, 'Clerk A authenticated in Chamber A');

    console.log('\n2. Testing Profile Settings (GET, PATCH, Avatar Upload & Removal)');
    const getProfileRes = await request(app)
      .get('/api/settings/profile')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(getProfileRes.status === 200, 'GET /api/settings/profile returned HTTP 200');
    assert(getProfileRes.body.data.fullName === 'Adv. Anjali Deshmukh', 'Profile fullName matches');
    assert(getProfileRes.body.data.roleInWorkspace === 'owner', 'Role in workspace returned correctly');

    const updateProfileRes = await request(app)
      .patch('/api/settings/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        designation: 'Senior High Court Counsel',
        officeAddress: 'Chamber 204, High Court Annexe, Mumbai',
        mobile: '+919811122299',
      });

    assert(updateProfileRes.status === 200, 'PATCH /api/settings/profile updated successfully');
    assert(
      updateProfileRes.body.data.designation === 'Senior High Court Counsel',
      'Designation saved'
    );
    assert(
      updateProfileRes.body.data.officeAddress === 'Chamber 204, High Court Annexe, Mumbai',
      'Office address saved'
    );

    // Avatar upload
    const dummyAvatarBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const uploadAvatarRes = await request(app)
      .post('/api/settings/profile/avatar')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ avatar: dummyAvatarBase64 });

    assert(uploadAvatarRes.status === 200, 'POST /api/settings/profile/avatar uploaded photo');
    assert(
      uploadAvatarRes.body.data.avatar.includes('cloudinary.com') || uploadAvatarRes.body.data.avatar.startsWith('https://'),
      'Cloudinary avatar secure URL returned'
    );

    // Avatar removal
    const deleteAvatarRes = await request(app)
      .delete('/api/settings/profile/avatar')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(deleteAvatarRes.status === 200, 'DELETE /api/settings/profile/avatar removed photo');
    assert(deleteAvatarRes.body.data.avatar === '', 'Avatar cleared in database');

    console.log('\n3. Testing Account Settings & Password Change');
    const getAccountRes = await request(app)
      .get('/api/settings/account')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(getAccountRes.status === 200, 'GET /api/settings/account returned HTTP 200');
    assert(getAccountRes.body.data.email === 'anjali@settings-test.com', 'Account email verified');
    assert(getAccountRes.body.data.status === 'active', 'Account status is active');

    // Update mobile
    const updateMobileRes = await request(app)
      .patch('/api/settings/account/mobile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ mobile: '+919811100011' });

    assert(updateMobileRes.status === 200, 'PATCH /api/settings/account/mobile succeeded');
    assert(updateMobileRes.body.data.mobile === '+919811100011', 'Mobile updated');

    // Change password (wrong current password)
    const wrongPassRes = await request(app)
      .patch('/api/settings/account/password')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        currentPassword: 'WrongPassword@999',
        newPassword: 'NewPassword@123',
        confirmPassword: 'NewPassword@123',
      });

    assert(wrongPassRes.status === 400, 'Wrong current password rejected with HTTP 400');

    // Change password (success)
    const changePassRes = await request(app)
      .patch('/api/settings/account/password')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        currentPassword: 'Password@123',
        newPassword: 'NewPassword@123',
        confirmPassword: 'NewPassword@123',
      });

    assert(changePassRes.status === 200, 'Password changed successfully with HTTP 200');

    // Verify login with new password
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'anjali@settings-test.com',
        password: 'NewPassword@123',
        workspaceId: wsAId,
      });

    assert(newLoginRes.status === 200, 'Login succeeded with new password');
    const freshTokenA = newLoginRes.body.data.tokens.accessToken;

    console.log('\n4. Testing Workspace Settings & Clerk Role Restrictions');
    const getWsRes = await request(app)
      .get('/api/settings/workspace')
      .set('Authorization', `Bearer ${freshTokenA}`);

    assert(getWsRes.status === 200, 'GET /api/settings/workspace returned HTTP 200');
    assert(getWsRes.body.data.name.includes('Settings Chamber A'), 'Workspace chamber name matches');
    assert(getWsRes.body.data.membersCount >= 2, 'Lists active members including advocate & clerk');

    // Advocate updates workspace details
    const updateWsRes = await request(app)
      .patch('/api/settings/workspace')
      .set('Authorization', `Bearer ${freshTokenA}`)
      .send({
        name: 'Deshmukh & Partners Law Chambers',
        officeName: 'Fort High Court Branch',
        address: 'Nariman Point, Mumbai - 400021',
        contactEmail: 'desk@deshmukhpartners.in',
        contactPhone: '+91 22 2200 4400',
        reminderDaysBefore: [1, 3, 7],
      });

    assert(updateWsRes.status === 200, 'Advocate updated workspace settings successfully');
    assert(updateWsRes.body.data.name === 'Deshmukh & Partners Law Chambers', 'Updated name saved');
    assert(
      JSON.stringify(updateWsRes.body.data.settings.reminderDaysBefore) === JSON.stringify([1, 3, 7]),
      'Reminder lead days saved'
    );

    // Advocate uploads workspace logo
    const updateLogoRes = await request(app)
      .post('/api/settings/workspace/logo')
      .set('Authorization', `Bearer ${freshTokenA}`)
      .send({ logo: dummyAvatarBase64 });

    assert(updateLogoRes.status === 200, 'Advocate uploaded chamber logo');

    // Role enforcement: Clerk attempts to update workspace settings -> MUST FAIL with 403 Forbidden!
    const clerkUpdateWsRes = await request(app)
      .patch('/api/settings/workspace')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({ name: 'Hacked Chamber by Clerk' });

    assert(
      clerkUpdateWsRes.status === 403,
      'Clerk restricted from updating workspace settings (HTTP 403 Forbidden)'
    );

    // Clerk attempts to upload workspace logo -> MUST FAIL with 403 Forbidden!
    const clerkLogoRes = await request(app)
      .post('/api/settings/workspace/logo')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({ logo: dummyAvatarBase64 });

    assert(
      clerkLogoRes.status === 403,
      'Clerk restricted from updating chamber logo (HTTP 403 Forbidden)'
    );

    console.log('\n5. Testing Appearance & Regional Preferences');
    const getPrefsRes = await request(app)
      .get('/api/settings/preferences')
      .set('Authorization', `Bearer ${freshTokenA}`);

    assert(getPrefsRes.status === 200, 'GET /api/settings/preferences returned HTTP 200');
    assert(getPrefsRes.body.data.timezone === 'Asia/Kolkata', 'Default timezone is Asia/Kolkata');
    assert(getPrefsRes.body.data.dateFormat === 'DD/MM/YYYY', 'Default date format is DD/MM/YYYY');

    const updatePrefsRes = await request(app)
      .patch('/api/settings/preferences')
      .set('Authorization', `Bearer ${freshTokenA}`)
      .send({
        theme: 'dark',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24-hour',
      });

    assert(updatePrefsRes.status === 200, 'Preferences updated successfully');
    assert(updatePrefsRes.body.data.theme === 'dark', 'Dark theme saved');
    assert(updatePrefsRes.body.data.dateFormat === 'YYYY-MM-DD', 'ISO date format saved');
    assert(updatePrefsRes.body.data.timeFormat === '24-hour', '24-hour time saved');

    console.log('\n6. Testing Active Session Management');
    const getSessionsRes = await request(app)
      .get('/api/settings/sessions')
      .set('Authorization', `Bearer ${freshTokenA}`);

    assert(getSessionsRes.status === 200, 'GET /api/settings/sessions returned HTTP 200');
    assert(getSessionsRes.body.data.sessions.length > 0, 'Active sessions list returned');
    assert(getSessionsRes.body.data.sessions.some((s: any) => s.isCurrent), 'Marks current session');

    // Revoke other sessions
    const revokeOthersRes = await request(app)
      .post('/api/settings/sessions/revoke-others')
      .set('Authorization', `Bearer ${freshTokenA}`);

    assert(revokeOthersRes.status === 200, 'POST /api/settings/sessions/revoke-others succeeded');

    console.log('\n7. Testing Security & Audit Feed');
    const getSecurityRes = await request(app)
      .get('/api/settings/security')
      .set('Authorization', `Bearer ${freshTokenA}`);

    assert(getSecurityRes.status === 200, 'GET /api/settings/security returned HTTP 200');
    assert(getSecurityRes.body.data.recentLogs.length > 0, 'Security audit activity logs returned');

    console.log('\n8. Testing Data Inventory & Chamber Archive Export');
    // Seed sample case & client in Chamber A
    const client = await Client.create({
      workspaceId: wsAId,
      fullName: 'Rameshwar Enterprises Ltd',
      mobile: '+919900011122',
      email: 'legal@rameshwar.com',
      clientType: 'Corporate',
    });

    const caseDoc = await Case.create({
      workspaceId: wsAId,
      caseNumber: 'WP/8945/2026',
      courtName: 'Bombay High Court',
      caseType: 'Civil',
      clientName: client.fullName,
      clientId: client._id,
      opponentName: 'Union of India & Ors',
      status: 'Pending',
    });

    const getSummaryRes = await request(app)
      .get('/api/settings/data-summary')
      .set('Authorization', `Bearer ${freshTokenA}`);

    assert(getSummaryRes.status === 200, 'GET /api/settings/data-summary returned HTTP 200');
    assert(getSummaryRes.body.data.totalCases >= 1, 'Data summary reflects chamber cases');
    assert(getSummaryRes.body.data.totalClients >= 1, 'Data summary reflects chamber clients');

    // Advocate exports data
    const exportRes = await request(app)
      .get('/api/settings/data-export')
      .set('Authorization', `Bearer ${freshTokenA}`);

    assert(exportRes.status === 200, 'Advocate exported chamber data successfully');
    assert(exportRes.body.data.chamber.name.includes('Deshmukh'), 'Export includes chamber metadata');
    assert(exportRes.body.data.data.cases.length >= 1, 'Export contains real case records');

    // Clerk attempts bulk export -> MUST FAIL with 403 Forbidden!
    const clerkExportRes = await request(app)
      .get('/api/settings/data-export')
      .set('Authorization', `Bearer ${clerkToken}`);

    assert(
      clerkExportRes.status === 403,
      'Clerk restricted from exporting chamber data (HTTP 403 Forbidden)'
    );

    console.log('\n9. Testing Multi-Tenant Settings Isolation');
    // Advocate B views workspace settings -> gets Chamber B, not Chamber A
    const wsBRes = await request(app)
      .get('/api/settings/workspace')
      .set('Authorization', `Bearer ${tokenB}`);

    assert(wsBRes.status === 200, 'Advocate B fetched own workspace settings');
    assert(
      wsBRes.body.data.name.includes('Settings Chamber B'),
      'Strict isolation: Advocate B sees Chamber B'
    );
    assert(
      !wsBRes.body.data.name.includes('Deshmukh'),
      'Strict isolation: Chamber A details never leak to Chamber B'
    );

    // Advocate B's data summary has 0 cases
    const summaryBRes = await request(app)
      .get('/api/settings/data-summary')
      .set('Authorization', `Bearer ${tokenB}`);

    assert(summaryBRes.body.data.totalCases === 0, 'Chamber B data inventory isolated from Chamber A');

    console.log('\n10. Testing Account Deactivation Safeguards');
    // Advocate A is sole owner of Chamber A which has other active members (Clerk)
    const advDeactivateRes = await request(app)
      .post('/api/settings/account/deactivate')
      .set('Authorization', `Bearer ${freshTokenA}`)
      .send({
        currentPassword: 'NewPassword@123',
        confirmationText: 'DEACTIVATE',
      });

    assert(
      advDeactivateRes.status === 400,
      'Primary owner with active chamber members prevented from self-deactivation'
    );

    // Clerk deactivates their own account
    const clerkDeactivateRes = await request(app)
      .post('/api/settings/account/deactivate')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({
        currentPassword: 'Password@123',
        confirmationText: 'DEACTIVATE',
      });

    assert(clerkDeactivateRes.status === 200, 'Clerk successfully deactivated account');

    // Verify court records still exist
    const casesStillExist = await Case.countDocuments({ workspaceId: wsAId });
    assert(casesStillExist >= 1, 'Legal court case records preserved after user deactivation');

    console.log('\n======================================================');
    console.log(`   SETTINGS TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    await closeDB();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Settings test execution error:', err);
    await closeDB();
    process.exit(1);
  }
};

runTests();
