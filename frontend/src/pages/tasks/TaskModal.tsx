import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertCircle } from 'lucide-react';
import { TaskRecord, TaskFormData, TaskPriority, TaskStatus } from '../../types/task';
import { useQuery } from '@tanstack/react-query';
import { casesApi } from '../../api/cases.api';
import { staffApi } from '../../api/staff.api';

const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Task title is required')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().optional(),
  caseId: z.string().optional(),
  assignedTo: z.string().min(1, 'Please select an assignee'),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent'] as const),
  status: z.enum(['Pending', 'To Do', 'In Progress', 'Completed', 'Cancelled'] as const).optional(),
});

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
  initialData?: TaskRecord | null;
  preselectedCaseId?: string;
  isSubmitting?: boolean;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  preselectedCaseId,
  isSubmitting = false,
}) => {
  const { data: staffMembers } = useQuery({
    queryKey: ['workspace-members'],
    queryFn: () => staffApi.getMembers(),
    enabled: isOpen,
  });

  const { data: casesData } = useQuery({
    queryKey: ['cases-dropdown-list'],
    queryFn: () => casesApi.getCases({ limit: 100, isArchived: false }),
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      caseId: preselectedCaseId || '',
      assignedTo: '',
      dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
      priority: 'Medium',
      status: 'Pending',
    },
  });

  useEffect(() => {
    if (initialData) {
      const assignedId =
        typeof initialData.assignedTo === 'object'
          ? initialData.assignedTo._id
          : initialData.assignedTo;

      const cId =
        typeof initialData.caseId === 'object'
          ? initialData.caseId._id
          : initialData.caseId || '';

      const dueFormatted = initialData.dueDate
        ? new Date(initialData.dueDate).toISOString().slice(0, 16)
        : '';

      reset({
        title: initialData.title,
        description: initialData.description || '',
        caseId: cId,
        assignedTo: assignedId,
        dueDate: dueFormatted,
        priority: initialData.priority,
        status: initialData.status,
      });
    } else {
      reset({
        title: '',
        description: '',
        caseId: preselectedCaseId || '',
        assignedTo: '',
        dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
        priority: 'Medium',
        status: 'Pending',
      });
    }
  }, [initialData, preselectedCaseId, isOpen, reset]);

  if (!isOpen) return null;

  const onFormSubmit = async (data: TaskFormData) => {
    await onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {initialData ? 'Edit Chamber Task' : 'Assign New Task'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track court filings, certified copy requests, and chamber assignments.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          {/* Task Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...register('title')}
              placeholder="e.g. Apply for Certified Copy of Order, File Process Fee..."
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 placeholder:text-slate-400"
            />
            {errors.title && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Related Case */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Related Case (Optional)
            </label>
            <select
              {...register('caseId')}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 bg-white"
            >
              <option value="">-- No specific case / General chamber task --</option>
              {casesData?.cases?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.caseNumber} - {c.courtName} ({c.clientName || 'Client'})
                </option>
              ))}
            </select>
          </div>

          {/* Grid: Assignee & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assign To <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('assignedTo')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 bg-white"
              >
                <option value="">-- Select Member --</option>
                {staffMembers?.map((m) => (
                  <option key={m.user._id} value={m.user._id}>
                    {m.user.fullName} ({m.role})
                  </option>
                ))}
              </select>
              {errors.assignedTo && (
                <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.assignedTo.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date & Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                {...register('dueDate')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 bg-white"
              />
              {errors.dueDate && (
                <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.dueDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Grid: Priority & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                {...register('priority')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent (Immediate filing)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 bg-white"
              >
                <option value="Pending">Pending</option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instructions / Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Provide specific chamber instructions, office registry details, or filing instructions..."
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-legal-900 hover:bg-legal-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : initialData ? (
                'Update Task'
              ) : (
                'Create & Assign Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

