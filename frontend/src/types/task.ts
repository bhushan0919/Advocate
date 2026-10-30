export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'Pending' | 'To Do' | 'In Progress' | 'Completed' | 'Cancelled';

export interface TaskCommentUser {
  _id: string;
  fullName: string;
  email: string;
}

export interface TaskComment {
  _id: string;
  comment: string;
  createdBy: TaskCommentUser;
  createdAt: string;
}

export interface TaskUserRef {
  _id: string;
  fullName: string;
  email: string;
  mobile?: string;
}

export interface TaskCaseRef {
  _id: string;
  caseNumber: string;
  courtName: string;
  clientName?: string;
}

export interface TaskRecord {
  _id: string;
  workspaceId: string;
  title: string;
  description?: string;
  caseId?: TaskCaseRef;
  caseNumber?: string;
  clientName?: string;
  assignedTo: TaskUserRef;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt?: string;
  completedBy?: TaskUserRef;
  comments: TaskComment[];
  createdBy: TaskUserRef;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFormData {
  title: string;
  description?: string;
  caseId?: string;
  assignedTo: string;
  dueDate: string;
  priority: TaskPriority;
  status?: TaskStatus;
}

export interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  highPriority: number;
}

