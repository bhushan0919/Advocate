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
import { Task } from '../models/Task.js';
import { Reminder } from '../models/Reminder.js';
import { Notification } from '../models/Notification.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { notificationService } from '../services/notification.service.js';

export const runPhase4RemindersTasksTests = async () => {
  console.log('\n======================================================');
  console.log('   AdvD PHASE 4: REMINDERS, NOTIFICATIONS & TASKS TEST');
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
    // 1. Clean test data
    await User.deleteMany({ email: /@phase4-test\.com$/ });
    const oldWorkspaces = await Workspace.find({ name: /Phase 4 Test/ });
    const wsIds = oldWorkspaces.map((w) => w._id);
    await Workspace.deleteMany({ _id: { $in: wsIds } });
    await WorkspaceMembership.deleteMany({ workspaceId: { $in: wsIds } });
    await Client.deleteMany({ workspaceId: { $in: wsIds } });
    await Case.deleteMany({ workspaceId: { $in: wsIds } });
    await Hearing.deleteMany({ workspaceId: { $in: wsIds } });
    await Task.deleteMany({ workspaceId: { $in: wsIds } });
    await Reminder.deleteMany({ workspaceId: { $in: wsIds } });
    await Notification.deleteMany({ workspaceId: { $in: wsIds } });
    await ActivityLog.deleteMany({ workspaceId: { $in: wsIds } });

    console.log('1. Setting up Chamber A (Advocate + Clerk) & Chamber B (Isolated Advocate)');

    // Advocate A
    const advARes = await request(app).post('/api/auth/register').send({
      fullName: 'Adv. Sameer Joshi',
      email: 'sameer.joshi@phase4-test.com',
      mobile: '+919833300001',
      password: 'Password@123',
      barCouncilNumber: 'MAH/2017/888',
      stateBarCouncil: 'Bar Council of Maharashtra & Goa',
      officeName: 'Phase 4 Test - Joshi Chambers',
    });
    assert(advARes.status === 201, 'Advocate A registered successfully');
    const tokenA = advARes.body.data.tokens.accessToken;
    const userA = advARes.body.data.user;

    // Clerk A Invite & Registration
    const inviteRes = await request(app)
      .post('/api/workspaces/invitations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        email: 'clerk.ramesh@phase4-test.com',
        role: 'clerk',
      });
    assert(inviteRes.status === 201, 'Clerk invitation generated');
    const clerkInviteToken =
      inviteRes.body.data.token || inviteRes.body.data.invitation?.token;

    const clerkAcceptRes = await request(app).post('/api/auth/accept-invitation').send({
      token: clerkInviteToken,
      fullName: 'Ramesh Sawant',
      mobile: '+919833300002',
      password: 'Password@123',
    });
    assert(clerkAcceptRes.status === 200, 'Clerk A accepted invitation');
    const tokenClerkA = clerkAcceptRes.body.data.tokens.accessToken;
    const userClerkA = clerkAcceptRes.body.data.user;

    // Advocate B (Chamber B - strictly isolated)
    const advBRes = await request(app).post('/api/auth/register').send({
      fullName: 'Adv. Vandana Kulkarni',
      email: 'vandana.k@phase4-test.com',
      mobile: '+919833300003',
      password: 'Password@123',
      barCouncilNumber: 'MAH/2019/999',
      stateBarCouncil: 'Bar Council of Maharashtra & Goa',
      officeName: 'Phase 4 Test - Kulkarni Chambers',
    });
    assert(advBRes.status === 201, 'Advocate B registered in separate workspace');
    const tokenB = advBRes.body.data.tokens.accessToken;

    console.log('\n2. Registering Client & Case in Chamber A');
    const clientRes = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Shrikant Patil',
        mobile: '+919811122233',
        email: 'shrikant.patil@phase4-test.com',
        clientType: 'Individual',
      });
    assert(clientRes.status === 201, 'Client created in Chamber A');
    const clientId = clientRes.body.data._id;

    // Create Case with upcoming hearing 2 days from now
    const twoDaysAhead = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const caseRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseNumber: 'WP/5050/2026',
        caseType: 'Civil',
        courtName: 'Bombay High Court',
        courtRoomNumber: 'Court Room 15',
        clientId,
        opponentName: 'State of Maharashtra',
        nextHearingDate: twoDaysAhead,
        nextHearingPurpose: 'Admission & Interim Relief',
        assignedClerkId: userClerkA.id || userClerkA._id,
      });
    assert(caseRes.status === 201, 'Case WP/5050/2026 created in Chamber A');
    const caseId = caseRes.body.data._id;

    console.log('\n3. Task Management Testing');

    // 3.1 Advocate creates task for Clerk
    const dueDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const taskCreateRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Obtain Certified Copy of Order',
        description: 'Apply at Registry Room 102 and pay process fees of Rs. 250.',
        caseId,
        assignedTo: userClerkA.id || userClerkA._id,
        dueDate,
        priority: 'High',
        status: 'Pending',
      });
    assert(taskCreateRes.status === 201, 'Task created for Clerk by Advocate');
    const taskId = taskCreateRes.body.data._id;
    assert(taskCreateRes.body.data.priority === 'High', 'Task priority set to High');
    assert(taskCreateRes.body.data.status === 'Pending', 'Initial task status is Pending');

    // 3.2 Notification verification: Clerk should have received task_assigned notification
    const clerkNotifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${tokenClerkA}`);
    assert(clerkNotifRes.status === 200, 'Clerk fetched notifications');
    const hasTaskNotif = clerkNotifRes.body.data.notifications.some(
      (n: any) => n.type === 'task_assigned' && n.taskId === taskId
    );
    assert(hasTaskNotif, 'Clerk received automated task_assigned notification');

    // 3.3 Task summary endpoint
    const summaryRes = await request(app)
      .get('/api/tasks/summary')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(summaryRes.status === 200, 'Task summary retrieved');
    assert(summaryRes.body.data.total >= 1, 'Summary reflects at least 1 total task');
    assert(summaryRes.body.data.pending >= 1, 'Summary reflects at least 1 pending task');

    // 3.4 Clerk updates task status to 'In Progress'
    const statusUpdateRes = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${tokenClerkA}`)
      .send({ status: 'In Progress' });
    assert(statusUpdateRes.status === 200, 'Clerk updated task status to In Progress');
    assert(statusUpdateRes.body.data.status === 'In Progress', 'Task status is now In Progress');

    // 3.5 Clerk adds work log comment
    const commentRes = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${tokenClerkA}`)
      .send({ comment: 'Application submitted with Token #9981. Copy ready tomorrow by 2 PM.' });
    assert(commentRes.status === 200, 'Clerk added progress comment');
    assert(commentRes.body.data.comments.length === 1, 'Task comments length is 1');
    assert(
      commentRes.body.data.comments[0].comment.includes('Token #9981'),
      'Comment contains token details'
    );

    // 3.6 Multi-tenant isolation: Chamber B cannot access or modify Chamber A task
    const idorTaskGet = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert(idorTaskGet.status === 404, 'Zero IDOR: Chamber B cannot access Chamber A task (404)');

    const idorTaskUpdate = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'Completed' });
    assert(idorTaskUpdate.status === 404, 'Zero IDOR: Chamber B cannot update Chamber A task status (404)');

    // 3.7 Clerk permission boundary: Clerk cannot delete task created by advocate
    const clerkDeleteAttempt = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${tokenClerkA}`);
    assert(
      clerkDeleteAttempt.status === 403,
      'Permission check: Clerk cannot delete advocate-assigned task (403 Forbidden)'
    );

    console.log('\n4. Reminder Management Testing');

    // 4.1 Custom reminder creation
    const customRemDate = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    const customRemRes = await request(app)
      .post('/api/reminders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Conference with Senior Advocate Soli',
        description: 'Discuss rejoinder arguments and citations.',
        reminderType: 'custom',
        reminderDate: customRemDate,
        priority: 'Urgent',
      });
    assert(customRemRes.status === 201, 'Custom reminder created');
    const customRemId = customRemRes.body.data._id;
    assert(customRemRes.body.data.priority === 'Urgent', 'Reminder priority is Urgent');

    // 4.2 Batch Generate Hearing Reminders
    const batchRemRes = await request(app)
      .post('/api/reminders/generate-hearing-reminders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caseId,
        hearingDate: twoDaysAhead,
        intervals: ['1_day_before', '3_days_before'],
      });
    assert(batchRemRes.status === 201, 'Batch generated hearing reminders for case');
    assert(Array.isArray(batchRemRes.body.data), 'Returns created reminders array');

    // 4.3 Deduplication: Attempting to create duplicate hearing reminder with same interval is rejected
    const dupRemRes = await request(app)
      .post('/api/reminders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Duplicate 1 Day Reminder',
        reminderType: 'hearing',
        intervalType: '1_day_before',
        caseId,
        reminderDate: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        priority: 'High',
      });
    assert(
      dupRemRes.status === 409,
      'Duplicate prevention: Repeated reminder schedule for same case hearing rejected (409 Conflict)'
    );

    // 4.4 Snooze reminder
    const snoozeRes = await request(app)
      .patch(`/api/reminders/${customRemId}/snooze`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ minutes: 60 });
    assert(snoozeRes.status === 200, 'Reminder snoozed by 60 minutes');
    assert(snoozeRes.body.data.status === 'Snoozed', 'Reminder status changed to Snoozed');
    assert(snoozeRes.body.data.snoozedUntil !== undefined, 'snoozedUntil timestamp recorded');

    // 4.5 Complete reminder
    const completeRemRes = await request(app)
      .patch(`/api/reminders/${customRemId}/complete`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(completeRemRes.status === 200, 'Reminder marked as Completed');
    assert(completeRemRes.body.data.status === 'Completed', 'Reminder status updated to Completed');

    // 4.6 Multi-tenant isolation for reminders
    const idorRemRes = await request(app)
      .get(`/api/reminders/${customRemId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert(idorRemRes.status === 404, 'Zero IDOR: Chamber B cannot access Chamber A reminder (404)');

    console.log('\n5. Background Reminder Processing & Notification Engine');

    // Create a due reminder in the past to test scanner
    const pastReminder = await Reminder.create({
      workspaceId: advARes.body.data.workspace.id,
      title: 'Filing Caveat in Sub-Court',
      description: 'Urgent caveat filing deadline.',
      reminderType: 'custom',
      reminderDate: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      priority: 'Urgent',
      assignedTo: userA.id || userA._id,
      status: 'Pending',
      isNotified: false,
      createdBy: userA.id || userA._id,
    });

    // 5.1 Trigger scanner
    const scanRes = await request(app)
      .post('/api/reminders/process-due')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(scanRes.status === 200, 'Process due reminders endpoint executed');
    assert(scanRes.body.data.triggered >= 1, 'Scanner processed at least 1 due reminder');

    // Check that reminder flipped isNotified to true
    const updatedPastRem = await Reminder.findById(pastReminder._id);
    assert(updatedPastRem?.isNotified === true, 'Reminder marked isNotified: true');

    // 5.2 Zero duplicate notifications on re-scan
    const secondScanRes = await request(app)
      .post('/api/reminders/process-due')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(
      secondScanRes.body.data.triggered === 0,
      'Re-scan idempotency: Already notified reminders are not triggered again'
    );

    // 5.3 Notifications API Testing
    const notifCountRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(notifCountRes.status === 200, 'Unread notification count retrieved');
    assert(notifCountRes.body.data.unreadCount >= 1, 'Unread count reflects generated alert');

    const notifsListRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(notifsListRes.status === 200, 'Notification list retrieved');
    const firstNotif = notifsListRes.body.data.notifications[0];
    assert(firstNotif !== undefined, 'Notification object present in response');

    // Mark single notification as read
    const markReadRes = await request(app)
      .patch(`/api/notifications/${firstNotif._id}/read`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(markReadRes.status === 200, 'Marked notification as read');
    assert(markReadRes.body.data.isRead === true, 'isRead is true');

    // Mark all as read
    const markAllRes = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(markAllRes.status === 200, 'Marked all notifications as read');

    const postMarkCount = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(postMarkCount.body.data.unreadCount === 0, 'Unread count is 0 after mark-all');

    console.log('\n6. Hearing Reschedule Reminders & Invalidation Hook');

    // Create a pending reminder specifically for the current nextHearingDate
    const hearingDateObj = new Date(twoDaysAhead);
    const preAdjournReminder = await Reminder.create({
      workspaceId: advARes.body.data.workspace.id,
      caseId,
      title: 'Old Hearing Reminder for Adjourned Hearing',
      reminderType: 'hearing',
      intervalType: '1_day_before',
      hearingDate: hearingDateObj,
      reminderDate: new Date(Date.now() + 24 * 3600 * 1000),
      priority: 'High',
      assignedTo: userA.id || userA._id,
      status: 'Pending',
      isNotified: false,
      createdBy: userA.id || userA._id,
    });

    // Record today's proceedings and adjourn to 10 days later
    const newNextDate = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const hearingRecordRes = await request(app)
      .post(`/api/cases/${caseId}/hearings`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        hearingDate: twoDaysAhead,
        purpose: 'Admission & Interim Relief',
        proceedings: 'Arguments heard in part. State requested 1 week for counter affidavit. Adjourned.',
        nextHearingDate: newNextDate,
        nextHearingPurpose: 'Final Hearing on Interim Relief',
        courtName: 'Bombay High Court',
        courtRoom: 'Court Room 15',
      });
    assert(hearingRecordRes.status === 201, 'Hearing proceedings recorded and case adjourned');

    // Verify old hearing reminder was invalidated/completed
    const checkOldRem = await Reminder.findById(preAdjournReminder._id);
    assert(
      checkOldRem?.status === 'Completed',
      'Hearing adjournment hook: Old pending reminder automatically completed upon adjournment'
    );

    // Verify new reminder for the rescheduled hearing was automatically scheduled
    const newRemCheck = await Reminder.findOne({
      workspaceId: advARes.body.data.workspace.id,
      caseId,
      intervalType: '1_day_before',
      status: 'Pending',
    });
    assert(newRemCheck !== null, 'Hearing adjournment hook: New 1-day-before reminder automatically generated');

    console.log('\n7. Live Dashboard Statistics Integration');

    const dashRes = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(dashRes.status === 200, 'Dashboard statistics API returned 200 OK');
    const { metrics: dashMetrics, hearingsToday, todayReminders, overdueTasks } = dashRes.body.data;
    assert(dashMetrics.activeCases >= 1, `Dashboard metrics reflects active cases (count: ${dashMetrics.activeCases})`);
    assert(dashMetrics.upcomingHearingsWeek >= 0, 'Dashboard reflects upcoming hearings');
    assert(Array.isArray(todayReminders), 'Dashboard includes todayReminders array');
    assert(Array.isArray(overdueTasks), 'Dashboard includes overdueTasks array');

    // Multi-tenant isolation on dashboard
    const dashBRes = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${tokenB}`);
    assert(dashBRes.status === 200, 'Chamber B dashboard stats returned 200 OK');
    assert(
      dashBRes.body.data.metrics.activeCases === 0,
      'Multi-tenant isolation: Chamber B dashboard shows 0 active cases'
    );

    // Final summary
    console.log('\n======================================================');
    console.log(`   PHASE 4 RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during Phase 4 tests:', err);
    process.exit(1);
  } finally {
    await closeDB();
  }
};

// Execute if run directly
if (process.argv[1]?.includes('phase4-reminders-tasks')) {
  runPhase4RemindersTasksTests();
}
