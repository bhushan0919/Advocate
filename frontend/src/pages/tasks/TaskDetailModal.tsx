import React, { useState } from 'react';
import {
  X,
  Clock,
  Calendar,
  User,
  Briefcase,
  AlertTriangle,
  MessageSquare,
  Send,
  Trash2,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { TaskRecord, TaskStatus } from '../../types/task';
import { tasksApi } from '../../api/tasks.api';

interface TaskDetailModalProps {
  task: TaskRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  onEdit: (task: TaskRecord) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onEdit,
}) => {
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !task) return null;

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      setIsUpdatingStatus(true);
      await tasksApi.updateTaskStatus(task._id, newStatus);
      onTaskUpdated();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setIsAddingComment(true);
      await tasksApi.addComment(task._id, commentText.trim());
      setCommentText('');
      onTaskUpdated();
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete task "${task.title}"?`)) return;

    try {
      setIsDeleting(true);
      await tasksApi.deleteTask(task._id);
      onTaskUpdated();
      onClose();
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const isOverdue =
    new Date(task.dueDate).getTime() < Date.now() &&
    task.status !== 'Completed' &&
    task.status !== 'Cancelled';

  const priorityColors = {
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
    Medium: 'bg-blue-50 text-blue-700 border-blue-200',
    High: 'bg-amber-50 text-amber-700 border-amber-200',
    Urgent: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
  };

  const caseIdStr =
    typeof task.caseId === 'object' ? task.caseId?._id : task.caseId;
  const caseNumberStr =
    typeof task.caseId === 'object' ? task.caseId?.caseNumber : task.caseNumber;
  const courtNameStr =
    typeof task.caseId === 'object' ? task.caseId?.courtName : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between">
          <div className="space-y-1 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  priorityColors[task.priority]
                }`}
              >
                {task.priority} Priority
              </span>
              {isOverdue && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500 text-white flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Overdue
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-snug">{task.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Status & Quick Status Picker */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">
                Current Status
              </span>
              <span className="font-bold text-sm text-slate-900">{task.status}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">Update:</span>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                disabled={isUpdatingStatus}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-legal-700/20"
              >
                <option value="Pending">Pending</option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Task Description */}
          {task.description && (
            <div>
              <h3 className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                Instructions & Details
              </h3>
              <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed">
                {task.description}
              </p>
            </div>
          )}

          {/* Grid Metadata: Case, Assignee, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Case Reference */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[10px] uppercase tracking-wider">
                <Briefcase className="w-3.5 h-3.5 text-legal-700" />
                <span>Related Case</span>
              </div>
              {caseIdStr ? (
                <div className="mt-1">
                  <Link
                    to={`/cases/${caseIdStr}`}
                    className="font-bold text-legal-800 hover:text-legal-900 flex items-center gap-1"
                  >
                    <span>{caseNumberStr || 'View Case Record'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  {courtNameStr && (
                    <div className="text-[11px] text-slate-500 mt-0.5">{courtNameStr}</div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 italic mt-1">General chamber task (No case linked)</div>
              )}
            </div>

            {/* Assignee */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[10px] uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-legal-700" />
                <span>Assigned Chamber Staff</span>
              </div>
              <div className="font-bold text-slate-900 mt-1">
                {task.assignedTo?.fullName || 'Assigned Member'}
              </div>
              {task.assignedTo?.email && (
                <div className="text-[11px] text-slate-500">{task.assignedTo.email}</div>
              )}
            </div>

            {/* Due Date */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[10px] uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-legal-700" />
                <span>Deadline</span>
              </div>
              <div
                className={`font-bold mt-1 ${
                  isOverdue ? 'text-rose-600 font-mono' : 'text-slate-900'
                }`}
              >
                {new Date(task.dueDate).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            {/* Created By & Date */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[10px] uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-legal-700" />
                <span>Creation Stamp</span>
              </div>
              <div className="text-slate-700 mt-1">
                By <strong>{task.createdBy?.fullName || 'Advocate'}</strong>
              </div>
              <div className="text-[10px] text-slate-400">
                {new Date(task.createdAt).toLocaleDateString('en-IN')}
              </div>
            </div>
          </div>

          {/* Progress Comments & Work Log */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-legal-800" />
                <span>Work Log & Comments ({task.comments?.length || 0})</span>
              </h3>
            </div>

            {/* Comments Timeline */}
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {!task.comments || task.comments.length === 0 ? (
                <div className="text-center py-4 bg-slate-50 rounded-xl text-slate-400 italic">
                  No progress updates or comments logged yet.
                </div>
              ) : (
                task.comments.map((c) => (
                  <div key={c._id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-800">{c.createdBy?.fullName || 'Chamber Staff'}</span>
                      <span className="text-slate-400">
                        {new Date(c.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">{c.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Log clerk filing status, registry token number, or progress note..."
                className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900"
              />
              <button
                type="submit"
                disabled={isAddingComment || !commentText.trim()}
                className="px-3.5 py-2 bg-legal-900 text-white rounded-lg hover:bg-legal-800 transition-colors disabled:opacity-50 flex items-center gap-1 font-semibold"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium text-xs disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Task</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(task);
              }}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors"
            >
              Edit Details
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-legal-900 hover:bg-legal-800 text-white rounded-lg font-semibold text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

