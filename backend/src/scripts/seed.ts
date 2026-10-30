import bcrypt from 'bcryptjs';
import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMembership, DEFAULT_CLERK_PERMISSIONS } from '../models/WorkspaceMembership.js';
import { Client } from '../models/Client.js';
import { Case } from '../models/Case.js';
import { Hearing } from '../models/Hearing.js';
import { Task } from '../models/Task.js';
import { Reminder } from '../models/Reminder.js';
import { Notification } from '../models/Notification.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { parseDateOnly } from '../utils/date.js';

const seedDatabase = async () => {
  console.log('[Seed] Starting database seeding with fictional demo advocates & workspaces...');
  await connectDB();

  try {
    // Clean demo users & workspaces
    const demoEmails = [
      'rajesh.sharma@advd-demo.in',
      'priya.deshmukh@advd-demo.in',
      'suresh.clerk@advd-demo.in',
    ];

    const existingUsers = await User.find({ email: { $in: demoEmails } });
    const userIds = existingUsers.map((u) => u._id);

    const existingWorkspaces = await Workspace.find({ ownerId: { $in: userIds } });
    const wsIds = existingWorkspaces.map((w) => w._id);

    await User.deleteMany({ _id: { $in: userIds } });
    await Workspace.deleteMany({ _id: { $in: wsIds } });
    await WorkspaceMembership.deleteMany({ workspaceId: { $in: wsIds } });
    await Client.deleteMany({ workspaceId: { $in: wsIds } });
    await Case.deleteMany({ workspaceId: { $in: wsIds } });
    await Hearing.deleteMany({ workspaceId: { $in: wsIds } });
    await Task.deleteMany({ workspaceId: { $in: wsIds } });
    await Reminder.deleteMany({ workspaceId: { $in: wsIds } });
    await Notification.deleteMany({ workspaceId: { $in: wsIds } });
    await ActivityLog.deleteMany({ workspaceId: { $in: wsIds } });

    const salt = await bcrypt.genSalt(10);
    const advocatePasswordHash = await bcrypt.hash('Advocate@123', salt);
    const clerkPasswordHash = await bcrypt.hash('Clerk@123', salt);

    // 1. Create Advocate 1
    const advA = await User.create({
      fullName: 'Adv. Rajesh Sharma',
      email: 'rajesh.sharma@advd-demo.in',
      mobile: '+91 98200 11223',
      passwordHash: advocatePasswordHash,
      barCouncilNumber: 'MAH/1042/2012',
      stateBarCouncil: 'Bar Council of Maharashtra & Goa',
      isEmailVerified: true,
      status: 'active',
    });

    const wsA = await Workspace.create({
      name: 'Sharma & Associates Legal Chambers',
      ownerId: advA._id,
      barCouncilNumber: 'MAH/1042/2012',
      stateBarCouncil: 'Bar Council of Maharashtra & Goa',
      officeName: 'Sharma & Associates',
      address: 'Suite 402, Chamber of Commerce, Fort, Mumbai - 400001',
      contactEmail: 'rajesh.sharma@advd-demo.in',
      contactPhone: '+91 98200 11223',
    });

    await WorkspaceMembership.create({
      workspaceId: wsA._id,
      userId: advA._id,
      role: 'owner',
      permissions: ['*'],
      status: 'active',
    });

    // 2. Create Clerk for Advocate 1
    const clerkA = await User.create({
      fullName: 'Suresh Verma (Clerk)',
      email: 'suresh.clerk@advd-demo.in',
      mobile: '+91 98200 44556',
      passwordHash: clerkPasswordHash,
      isEmailVerified: true,
      status: 'active',
    });

    await WorkspaceMembership.create({
      workspaceId: wsA._id,
      userId: clerkA._id,
      role: 'clerk',
      permissions: DEFAULT_CLERK_PERMISSIONS,
      status: 'active',
    });

    // 3. Create Advocate 2 (Completely independent workspace)
    const advB = await User.create({
      fullName: 'Adv. Priya Deshmukh',
      email: 'priya.deshmukh@advd-demo.in',
      mobile: '+91 98200 99887',
      passwordHash: advocatePasswordHash,
      barCouncilNumber: 'MAH/5821/2016',
      stateBarCouncil: 'Bar Council of Maharashtra & Goa',
      isEmailVerified: true,
      status: 'active',
    });

    const wsB = await Workspace.create({
      name: 'Deshmukh Law Chambers',
      ownerId: advB._id,
      barCouncilNumber: 'MAH/5821/2016',
      stateBarCouncil: 'Bar Council of Maharashtra & Goa',
      officeName: 'Deshmukh Law Chambers',
      address: '2nd Floor, Nariman Point, Mumbai - 400021',
      contactEmail: 'priya.deshmukh@advd-demo.in',
      contactPhone: '+91 98200 99887',
    });

    await WorkspaceMembership.create({
      workspaceId: wsB._id,
      userId: advB._id,
      role: 'owner',
      permissions: ['*'],
      status: 'active',
    });

    // 4. Seed Realistic Clients for Workspace A
    const clientA1 = await Client.create({
      workspaceId: wsA._id,
      fullName: 'Kailash Singhania',
      mobile: '+91 98210 11222',
      email: 'kailash@singhania-group.com',
      address: '42 Nariman Point, Mumbai - 400021',
      clientType: 'Corporate',
      notes: 'Managing Director, Singhania Infrastructure Group. Retainer client since 2018.',
      isArchived: false,
    });

    const clientA2 = await Client.create({
      workspaceId: wsA._id,
      fullName: 'Rameshwar Developers Pvt Ltd',
      mobile: '+91 98210 33444',
      email: 'legal@rameshwardev.in',
      address: 'Plot 104, MIDC Andheri East, Mumbai',
      clientType: 'Corporate',
      notes: 'Real estate developer; handles SRA and redevelopment disputes.',
      isArchived: false,
    });

    const clientA3 = await Client.create({
      workspaceId: wsA._id,
      fullName: 'Vijay Kumar Gupta',
      mobile: '+91 98210 55666',
      email: 'vijay.gupta@tradersmail.com',
      address: 'Shop 12, Crawford Market, Mumbai',
      clientType: 'Individual',
      notes: 'Wholesale textile merchant. Negotiable Instruments Act 138 matters.',
      isArchived: false,
    });

    const clientA4 = await Client.create({
      workspaceId: wsA._id,
      fullName: 'Sunita Arvind Joshi',
      mobile: '+91 98210 77888',
      email: 'sunita.joshi@outlook.com',
      address: 'B-203, Sea Breeze CHS, Prabhadevi, Mumbai',
      clientType: 'Individual',
      notes: 'Matrimonial maintenance and custody dispute.',
      isArchived: false,
    });

    // 5. Seed Realistic Court Cases for Workspace A
    const case1 = await Case.create({
      workspaceId: wsA._id,
      caseNumber: 'WP/3819/2024',
      cnrNumber: 'MHCB010023452024',
      caseType: 'Civil',
      courtName: 'Bombay High Court',
      courtLocation: 'Fort, Mumbai',
      courtRoomNumber: 'Room 14',
      clientId: clientA1._id,
      clientName: clientA1.fullName,
      opponentName: 'Municipal Corp of Greater Mumbai',
      opponentAdvocate: 'Adv. S. K. Mehta',
      filingDate: parseDateOnly('2024-03-12'),
      previousHearingDate: parseDateOnly('2026-10-14'),
      nextHearingDate: parseDateOnly('2026-11-05'),
      nextHearingPurpose: 'Admission / Interim Relief (Stay on Demolition Notice)',
      status: 'Pending',
      assignedClerkId: clerkA._id,
      caseDescription: 'Writ Petition under Article 226 challenging illegal notice issued under Section 351 of MMC Act.',
      isArchived: false,
    });

    const case2 = await Case.create({
      workspaceId: wsA._id,
      caseNumber: 'ARB/112/2025',
      cnrNumber: 'MHCB010077882025',
      caseType: 'Civil',
      courtName: 'Bombay High Court',
      courtLocation: 'Fort, Mumbai',
      courtRoomNumber: 'Room 09',
      clientId: clientA1._id,
      clientName: clientA1.fullName,
      opponentName: 'Apex Infrastructure Consortium',
      opponentAdvocate: 'Senior Counsel Harish Salve & Co.',
      filingDate: parseDateOnly('2025-01-20'),
      previousHearingDate: parseDateOnly('2026-10-30'),
      nextHearingDate: parseDateOnly('2026-11-18'),
      nextHearingPurpose: 'Section 11 Appointment of Sole Arbitrator',
      status: 'Pending',
      assignedClerkId: clerkA._id,
      caseDescription: 'Arbitration application for appointment of retired High Court judge as arbitrator for contract dispute.',
      isArchived: false,
    });

    const case3 = await Case.create({
      workspaceId: wsA._id,
      caseNumber: 'SC/1042/2023',
      cnrNumber: 'MHCC020088992023',
      caseType: 'Property',
      courtName: 'City Civil Court, Mumbai',
      courtLocation: 'Old Secretariat Bldg, Fort',
      courtRoomNumber: 'Court Room 07',
      clientId: clientA2._id,
      clientName: clientA2.fullName,
      opponentName: 'Anil Deshmukh & Ors',
      opponentAdvocate: 'Adv. M. P. Varma',
      filingDate: parseDateOnly('2023-08-10'),
      previousHearingDate: parseDateOnly('2026-09-25'),
      nextHearingDate: parseDateOnly('2026-11-12'),
      nextHearingPurpose: 'Cross Examination of Plaintiff Witness (PW-1)',
      status: 'Pending',
      assignedClerkId: clerkA._id,
      caseDescription: 'Special Civil Suit for specific performance of development agreement and permanent injunction.',
      isArchived: false,
    });

    const case4 = await Case.create({
      workspaceId: wsA._id,
      caseNumber: 'CC/540/2025',
      cnrNumber: 'MHMM030044552025',
      caseType: 'Criminal',
      courtName: 'Metropolitan Magistrate Court',
      courtLocation: 'Esplanade Court, Mumbai',
      courtRoomNumber: 'Court Room 22',
      clientId: clientA3._id,
      clientName: clientA3.fullName,
      opponentName: 'Sunrise Enterprises (Prop. Nilesh Shah)',
      opponentAdvocate: 'Adv. R. K. Nair',
      filingDate: parseDateOnly('2025-02-14'),
      previousHearingDate: parseDateOnly('2026-10-02'),
      nextHearingDate: parseDateOnly('2026-11-25'),
      nextHearingPurpose: 'Verification of Complainant on Oath',
      status: 'Pending',
      assignedClerkId: clerkA._id,
      caseDescription: 'Complaint under Section 138 of Negotiable Instruments Act for dishonour of cheque worth Rs 45,00,000.',
      isArchived: false,
    });

    const case5 = await Case.create({
      workspaceId: wsA._id,
      caseNumber: 'MA/214/2024',
      cnrNumber: 'MHFM010012342024',
      caseType: 'Family',
      courtName: 'Family Court, Bandra',
      courtLocation: 'Bandra Kurla Complex, Mumbai',
      courtRoomNumber: 'Court No. 3',
      clientId: clientA4._id,
      clientName: clientA4.fullName,
      opponentName: 'Arvind M. Joshi',
      opponentAdvocate: 'Adv. Shalini Parekh',
      filingDate: parseDateOnly('2024-05-18'),
      previousHearingDate: parseDateOnly('2026-10-10'),
      nextHearingDate: parseDateOnly('2026-12-02'),
      nextHearingPurpose: 'Counseling Session / Interim Maintenance Arguments',
      status: 'Pending',
      assignedClerkId: clerkA._id,
      caseDescription: 'Petition under Hindu Marriage Act Section 13(1)(ia) for dissolution of marriage and interim maintenance.',
      isArchived: false,
    });

    // Today's Cause List Cases (Scheduled for 2026-10-30)
    const case6 = await Case.create({
      workspaceId: wsA._id,
      caseNumber: 'BA/891/2026',
      cnrNumber: 'MHSS010045672026',
      caseType: 'Criminal',
      courtName: 'City Sessions Court, Mumbai',
      courtLocation: 'Kala Ghoda, Fort',
      courtRoomNumber: 'Court Room 04',
      clientId: clientA3._id,
      clientName: clientA3.fullName,
      opponentName: 'State of Maharashtra (CBI/EOW)',
      opponentAdvocate: 'Public Prosecutor S. Jadhav',
      filingDate: parseDateOnly('2026-10-15'),
      previousHearingDate: parseDateOnly('2026-10-22'),
      nextHearingDate: parseDateOnly('2026-10-30'),
      nextHearingPurpose: 'Arguments on Regular Bail Application under Section 439 CrPC',
      status: 'Pending',
      assignedClerkId: clerkA._id,
      caseDescription: 'Anticipatory / Regular bail application in alleged financial discrepancy matter.',
      isArchived: false,
    });

    const case7 = await Case.create({
      workspaceId: wsA._id,
      caseNumber: 'OS/450/2025',
      cnrNumber: 'MHCB010099112025',
      caseType: 'Civil',
      courtName: 'Bombay High Court',
      courtLocation: 'Fort, Mumbai',
      courtRoomNumber: 'Court Room 11',
      clientId: clientA2._id,
      clientName: clientA2.fullName,
      opponentName: 'Metropolitan Housing Authority',
      opponentAdvocate: 'Government Pleader P. Sawant',
      filingDate: parseDateOnly('2025-06-20'),
      previousHearingDate: parseDateOnly('2026-10-15'),
      nextHearingDate: parseDateOnly('2026-10-30'),
      nextHearingPurpose: 'Hearing on Interim Notice of Motion for Injunction',
      status: 'Pending',
      assignedClerkId: clerkA._id,
      caseDescription: 'Suit on original side for permanent injunction restraining revocation of layout sanction.',
      isArchived: false,
    });

    // 6. Seed Realistic Historical Hearings for Workspace A
    // Hearing 1: Case 1 historical proceeding
    await Hearing.create({
      workspaceId: wsA._id,
      caseId: case1._id,
      caseNumber: case1.caseNumber,
      clientName: case1.clientName,
      opponentName: case1.opponentName,
      caseType: case1.caseType,
      courtName: case1.courtName,
      courtRoom: case1.courtRoomNumber,
      hearingDate: parseDateOnly('2026-10-14'),
      purpose: 'Admission & Ad-Interim Relief',
      proceedings:
        'Adv. Rajesh Sharma appeared for petitioner. Argued that respondent corporation failed to provide 15 days statutory notice before issuing impugned order. Hon\'ble Court granted ad-interim protection staying demolition. MCGM directed to produce original layout records.',
      nextHearingDate: parseDateOnly('2026-11-05'),
      nextHearingPurpose: 'Admission / Interim Relief (Stay on Demolition Notice)',
      additionalRemarks: 'Court records perused. Formal order copy collected by Clerk Suresh.',
      createdBy: advA._id,
      recordedBy: advA._id,
      corrections: [],
    });

    // Hearing 2: Case 2 proceeding recorded TODAY (Completed Diary Item)
    await Hearing.create({
      workspaceId: wsA._id,
      caseId: case2._id,
      caseNumber: case2.caseNumber,
      clientName: case2.clientName,
      opponentName: case2.opponentName,
      caseType: case2.caseType,
      courtName: case2.courtName,
      courtRoom: case2.courtRoomNumber,
      hearingDate: parseDateOnly('2026-10-30'),
      purpose: 'Section 11 Sole Arbitrator Hearing',
      proceedings:
        'Counsel for both parties arrived at consensus regarding arbitrator appointment. Hon\'ble High Court appointed retired judge Justice (Retd.) V.K. Murthy as Sole Arbitrator. Matter disposed of on Section 11 stage; compliance and schedule fixed.',
      nextHearingDate: parseDateOnly('2026-11-18'),
      nextHearingPurpose: 'Arbitration Preliminary Meeting / Terms of Reference',
      additionalRemarks: 'Informed client Kailash Singhania over phone immediately after rising of Court 9.',
      createdBy: advA._id,
      recordedBy: advA._id,
      corrections: [],
    });

    // Hearing 3: Case 3 historical proceeding with clerk recording
    await Hearing.create({
      workspaceId: wsA._id,
      caseId: case3._id,
      caseNumber: case3.caseNumber,
      clientName: case3.clientName,
      opponentName: case3.opponentName,
      caseType: case3.caseType,
      courtName: case3.courtName,
      courtRoom: case3.courtRoomNumber,
      hearingDate: parseDateOnly('2026-09-25'),
      purpose: 'Framing of Issues',
      proceedings:
        'Framing of issues completed by Ld. City Civil Judge: 1. Whether plaintiff proves readiness and willingness? 2. Whether defendant breached terms? Matter posted for examination-in-chief of plaintiff witness.',
      nextHearingDate: parseDateOnly('2026-11-12'),
      nextHearingPurpose: 'Cross Examination of Plaintiff Witness (PW-1)',
      additionalRemarks: 'PW-1 evidence affidavit draft to be finalized with senior counsel by 1st week of November.',
      createdBy: clerkA._id,
      recordedBy: clerkA._id,
      corrections: [],
    });

    // Hearing 4: Case 4 proceeding with audited correction
    await Hearing.create({
      workspaceId: wsA._id,
      caseId: case4._id,
      caseNumber: case4.caseNumber,
      clientName: case4.clientName,
      opponentName: case4.opponentName,
      caseType: case4.caseType,
      courtName: case4.courtName,
      courtRoom: case4.courtRoomNumber,
      hearingDate: parseDateOnly('2026-10-02'),
      purpose: 'Summons Returnable & Appearance',
      proceedings:
        'Accused Nilesh Shah appeared on court summons with counsel Adv. R.K. Nair and furnished surety bond of Rs 25,000. Particulars of offence under Sec 138 explained to accused. Plea of not guilty entered.',
      nextHearingDate: parseDateOnly('2026-11-25'),
      nextHearingPurpose: 'Verification of Complainant on Oath',
      additionalRemarks: 'Complainant original dishonoured cheques verified by courtroom registry.',
      createdBy: advA._id,
      recordedBy: advA._id,
      corrections: [
        {
          correctedBy: advA._id,
          correctedAt: new Date('2026-10-03T10:30:00Z'),
          reason: 'Corrected surety bond amount from Rs 20,000 to Rs 25,000 as per signed bail bond docket.',
          previousValues: {
            proceedings:
              'Accused Nilesh Shah appeared on court summons with counsel Adv. R.K. Nair and furnished surety bond of Rs 20,000. Particulars of offence under Sec 138 explained to accused. Plea of not guilty entered.',
          },
        },
      ],
    });

    // 7. Seed Tasks for Chamber A (Advocate & Clerk)
    const task1 = await Task.create({
      workspaceId: wsA._id,
      title: 'Apply for Certified Copy of Order',
      description: 'Apply in Registry Room 102 for certified copy of stay order dated 28-Oct-2026.',
      caseId: case1._id,
      caseNumber: case1.caseNumber,
      clientName: clientA1.fullName,
      assignedTo: clerkA._id,
      dueDate: new Date(Date.now() + 24 * 3600 * 1000),
      priority: 'High',
      status: 'In Progress',
      comments: [
        {
          userId: clerkA._id,
          userName: clerkA.fullName,
          comment: 'Application submitted with Token #9981. Registry instructed to collect copy tomorrow.',
          createdAt: new Date(),
        },
      ],
      createdBy: advA._id,
    });

    const task2 = await Task.create({
      workspaceId: wsA._id,
      title: 'Pay Process Fee & File Notice Form',
      description: 'Pay court process fee and file speed post acknowledgment docket.',
      caseId: case2._id,
      caseNumber: case2.caseNumber,
      clientName: clientA2.fullName,
      assignedTo: clerkA._id,
      dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      priority: 'Medium',
      status: 'Pending',
      comments: [],
      createdBy: advA._id,
    });

    const task3 = await Task.create({
      workspaceId: wsA._id,
      title: 'Submit Vakalatnama in Metropolitan Magistrate Court',
      description: 'File original vakalatnama in Court Room 22 before hearing date.',
      caseId: case4._id,
      caseNumber: case4.caseNumber,
      clientName: clientA4.fullName,
      assignedTo: clerkA._id,
      dueDate: new Date(Date.now() - 24 * 3600 * 1000), // Overdue task demo
      priority: 'Urgent',
      status: 'Pending',
      comments: [],
      createdBy: advA._id,
    });

    // 8. Seed Reminders for Chamber A
    const reminder1 = await Reminder.create({
      workspaceId: wsA._id,
      caseId: case1._id,
      title: `Hearing: ${case1.caseNumber} - ${case1.courtName}`,
      description: `Matter listed for Interim Relief before Court Room 14. Keep citations ready.`,
      reminderType: 'hearing',
      intervalType: '1_day_before',
      hearingDate: case1.nextHearingDate,
      reminderDate: new Date(Date.now() + 4 * 3600 * 1000),
      priority: 'High',
      assignedTo: advA._id,
      status: 'Pending',
      isNotified: false,
      caseNumber: case1.caseNumber,
      clientName: clientA1.fullName,
      courtName: case1.courtName,
      hearingPurpose: case1.nextHearingPurpose,
      createdBy: advA._id,
    });

    const reminder2 = await Reminder.create({
      workspaceId: wsA._id,
      title: 'Pre-trial Client Conference: Kailash Singhania',
      description: 'Review affidavit rejoinder draft with Mr. Kailash Singhania in chambers.',
      reminderType: 'custom',
      reminderDate: new Date(Date.now() + 2 * 3600 * 1000),
      priority: 'Urgent',
      assignedTo: advA._id,
      status: 'Pending',
      isNotified: false,
      createdBy: advA._id,
    });

    // 9. Seed Notifications for Chamber A
    await Notification.create({
      workspaceId: wsA._id,
      userId: clerkA._id,
      type: 'task_assigned',
      title: 'New Task Assigned: Apply for Certified Copy',
      message: 'Adv. Rajesh Sharma assigned you task "Apply for Certified Copy of Order" due tomorrow.',
      priority: 'High',
      taskId: task1._id,
      caseId: case1._id,
      actionUrl: '/tasks',
      isRead: false,
    });

    await Notification.create({
      workspaceId: wsA._id,
      userId: advA._id,
      type: 'upcoming_hearing',
      title: `Hearing Scheduled: ${case1.caseNumber}`,
      message: `Matter listed in ${case1.courtName} (${case1.courtRoomNumber}) tomorrow for Interim Relief.`,
      priority: 'High',
      caseId: case1._id,
      actionUrl: `/cases/${case1._id}`,
      isRead: false,
    });

    // 10. Seed Independent Client & Case for Workspace B (Isolated)
    const clientB1 = await Client.create({
      workspaceId: wsB._id,
      fullName: 'Jacob Thomas (Chamber B Litigant)',
      mobile: '+91 98470 11999',
      email: 'jacob.thomas@keralamail.com',
      clientType: 'Individual',
      isArchived: false,
    });

    await Case.create({
      workspaceId: wsB._id,
      caseNumber: 'WP(C)/9821/2025',
      cnrNumber: 'KERHC010099882025',
      caseType: 'Civil',
      courtName: 'High Court of Kerala',
      courtLocation: 'Ernakulam',
      courtRoomNumber: 'Court 4B',
      clientId: clientB1._id,
      clientName: clientB1.fullName,
      opponentName: 'State of Kerala & Department of Revenue',
      filingDate: new Date('2025-06-01'),
      status: 'Pending',
      isArchived: false,
    });

    console.log('[Seed] Seeding completed successfully!');
    console.log('------------------------------------------------------------');
    console.log('Fictional Demo Accounts Created:');
    console.log('1. Advocate A (Workspace A):');
    console.log('   Email:    rajesh.sharma@advd-demo.in');
    console.log('   Password: Advocate@123');
    console.log('   Workspace: Sharma & Associates Legal Chambers');
    console.log('');
    console.log('2. Clerk A1 (Workspace A Staff):');
    console.log('   Email:    suresh.clerk@advd-demo.in');
    console.log('   Password: Clerk@123');
    console.log('   Workspace: Sharma & Associates Legal Chambers');
    console.log('');
    console.log('3. Advocate B (Workspace B - Independent):');
    console.log('   Email:    priya.deshmukh@advd-demo.in');
    console.log('   Password: Advocate@123');
    console.log('   Workspace: Deshmukh Law Chambers');
    console.log('------------------------------------------------------------');
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
  } finally {
    await closeDB();
  }
};

seedDatabase();

