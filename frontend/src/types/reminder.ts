export type ReminderType = 'hearing' | 'custom';
export type ReminderPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type ReminderStatus = 'Pending' | 'Completed' | 'Dismissed' | 'Snoozed';
export type ReminderInterval =
  | '1_day_before'
  | '3_days_before'
  | '7_days_before'
  | 'custom'
  | 'manual';

export interface ReminderUserRef {
  _id: string;
  fullName: string;
  email: string;
  mobile?: string;
}

export interface ReminderCaseRef {
  _id: string;
  caseNumber: string;
  courtName: string;
  clientName?: string;
}

export interface ReminderRecord {
  _id: string;
  workspaceId: string;
  caseId?: ReminderCaseRef;
  hearingId?: string;
  title: string;
  description?: string;
  reminderType: ReminderType;
  intervalType?: ReminderInterval;
  hearingDate?: string;
  reminderDate: string;
  priority: ReminderPriority;
  assignedTo: ReminderUserRef;
  status: ReminderStatus;
  snoozedUntil?: string;
  isNotified: boolean;
  notifiedAt?: string;
  caseNumber?: string;
  clientName?: string;
  courtName?: string;
  hearingPurpose?: string;
  createdBy: ReminderUserRef;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderFormData {
  title: string;
  description?: string;
  reminderType: ReminderType;
  intervalType?: ReminderInterval;
  caseId?: string;
  hearingDate?: string;
  reminderDate: string;
  priority: ReminderPriority;
  assignedTo?: string;
}

